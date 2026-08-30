package com.kurage.api.service;

import com.kurage.api.config.S3Config;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class S3ServiceTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(S3Config.class, ImageUploadService.class, S3Service.class);

    @Test
    void applicationContextStartsWithoutR2Configuration() {
        contextRunner
                .withPropertyValues(
                        "cloudflare.r2.access-key=",
                        "cloudflare.r2.secret-key=",
                        "cloudflare.r2.endpoint=",
                        "cloudflare.r2.public-url="
                )
                .run(context -> {
                    assertNull(context.getStartupFailure());
                    assertTrue(context.isRunning());
                    assertFalse(context.containsBean("s3Client"));
                    assertTrue(context.containsBean("s3Service"));
                });
    }

    @Test
    void applicationContextStartsWithPartialR2Configuration() {
        contextRunner
                .withPropertyValues(
                        "cloudflare.r2.access-key=access-key",
                        "cloudflare.r2.secret-key=",
                        "cloudflare.r2.endpoint=https://account.r2.cloudflarestorage.com"
                )
                .run(context -> {
                    assertNull(context.getStartupFailure());
                    assertTrue(context.isRunning());
                    assertFalse(context.containsBean("s3Client"));
                    assertTrue(context.containsBean("s3Service"));
                });
    }

    @Test
    void uploadFailsClearlyOnlyWhenStorageIsUsed() throws Exception {
        @SuppressWarnings("unchecked")
        ObjectProvider<S3Client> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(null);
        S3Service service = new S3Service(provider, new ImageUploadService());
        ReflectionTestUtils.setField(service, "publicUrl", "");
        ReflectionTestUtils.setField(service, "bucketName", "kurage-bucket");

        org.springframework.web.server.ResponseStatusException exception = assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> service.uploadAvatar(file(), UUID.randomUUID())
        );

        assertEquals(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, exception.getStatusCode());
    }

    @Test
    void missingPublicUrlFailsBeforeUploading() throws Exception {
        @SuppressWarnings("unchecked")
        ObjectProvider<S3Client> provider = mock(ObjectProvider.class);
        S3Client client = mock(S3Client.class);
        when(provider.getIfAvailable()).thenReturn(client);
        S3Service service = new S3Service(provider, new ImageUploadService());
        ReflectionTestUtils.setField(service, "publicUrl", "   ");
        ReflectionTestUtils.setField(service, "bucketName", "kurage-bucket");

        org.springframework.web.server.ResponseStatusException exception = assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> service.uploadAvatar(file(), UUID.randomUUID())
        );

        assertEquals(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, exception.getStatusCode());
        verify(client, never()).putObject(
                any(software.amazon.awssdk.services.s3.model.PutObjectRequest.class),
                any(software.amazon.awssdk.core.sync.RequestBody.class)
        );
    }

    @Test
    void configuredStorageKeepsNormalUploadPath() throws Exception {
        @SuppressWarnings("unchecked")
        ObjectProvider<S3Client> provider = mock(ObjectProvider.class);
        S3Client client = mock(S3Client.class);
        when(provider.getIfAvailable()).thenReturn(client);
        S3Service service = new S3Service(provider, new ImageUploadService());
        ReflectionTestUtils.setField(service, "publicUrl", "https://cdn.example.com/");
        ReflectionTestUtils.setField(service, "bucketName", "kurage-bucket");
        UUID userId = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");

        String uploadedUrl = service.uploadAvatar(file(), userId);

        assertTrue(uploadedUrl.startsWith(
                "https://cdn.example.com/avatars/123e4567-e89b-12d3-a456-426614174000/"
        ));
        assertTrue(uploadedUrl.endsWith(".png"));
        var requestCaptor = forClass(PutObjectRequest.class);
        verify(client).putObject(requestCaptor.capture(), any(software.amazon.awssdk.core.sync.RequestBody.class));
        assertEquals("image/png", requestCaptor.getValue().contentType());
        assertEquals("inline", requestCaptor.getValue().contentDisposition());
        assertEquals("public, max-age=31536000, immutable", requestCaptor.getValue().cacheControl());
    }

    @Test
    void cleanupDeletesOnlyObjectsOwnedByTheConfiguredPublicOrigin() {
        @SuppressWarnings("unchecked")
        ObjectProvider<S3Client> provider = mock(ObjectProvider.class);
        S3Client client = mock(S3Client.class);
        when(provider.getIfAvailable()).thenReturn(client);
        S3Service service = new S3Service(provider, new ImageUploadService());
        ReflectionTestUtils.setField(service, "publicUrl", "https://cdn.example.com/");
        ReflectionTestUtils.setField(service, "bucketName", "kurage-bucket");

        service.deleteImageIfOwned(
                "https://cdn.example.com/avatars/123e4567-e89b-12d3-a456-426614174000/old.png?v=1");
        service.deleteImageIfOwned("https://attacker.example/avatars/foreign.png");

        var requestCaptor = forClass(DeleteObjectRequest.class);
        verify(client).deleteObject(requestCaptor.capture());
        assertEquals(
                "avatars/123e4567-e89b-12d3-a456-426614174000/old.png",
                requestCaptor.getValue().key());
    }

    @Test
    void transportFailureReturnsBadGatewayAndCleanupRemainsBestEffort() throws Exception {
        @SuppressWarnings("unchecked")
        ObjectProvider<S3Client> provider = mock(ObjectProvider.class);
        S3Client client = mock(S3Client.class);
        when(provider.getIfAvailable()).thenReturn(client);
        S3Service service = new S3Service(provider, new ImageUploadService());
        ReflectionTestUtils.setField(service, "publicUrl", "https://cdn.example.com");
        ReflectionTestUtils.setField(service, "bucketName", "kurage-bucket");
        when(client.putObject(any(PutObjectRequest.class), any(software.amazon.awssdk.core.sync.RequestBody.class)))
                .thenThrow(SdkClientException.create("network unavailable"));

        var exception = assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> service.uploadAvatar(file(), UUID.randomUUID())
        );
        assertEquals(org.springframework.http.HttpStatus.BAD_GATEWAY, exception.getStatusCode());

        when(client.deleteObject(any(DeleteObjectRequest.class)))
                .thenThrow(SdkClientException.create("network unavailable"));
        service.deleteImageIfOwned("https://cdn.example.com/avatars/user/old.png");
    }

    private MockMultipartFile file() throws Exception {
        BufferedImage image = new BufferedImage(16, 16, BufferedImage.TYPE_INT_RGB);
        var graphics = image.createGraphics();
        graphics.setColor(Color.CYAN);
        graphics.fillRect(0, 0, 16, 16);
        graphics.dispose();
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return new MockMultipartFile("file", "avatar.png", "image/png", output.toByteArray());
    }
}
