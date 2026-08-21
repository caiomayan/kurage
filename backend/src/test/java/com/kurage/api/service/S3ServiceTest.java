package com.kurage.api.service;

import com.kurage.api.config.S3Config;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.services.s3.S3Client;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class S3ServiceTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(S3Config.class, S3Service.class);

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
        S3Service service = new S3Service(provider);
        ReflectionTestUtils.setField(service, "publicUrl", "");
        ReflectionTestUtils.setField(service, "bucketName", "kurage-bucket");

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> service.uploadAvatar(file(), UUID.randomUUID())
        );

        assertTrue(exception.getMessage().contains("R2 storage is not configured"));
    }

    @Test
    void missingPublicUrlFailsBeforeUploading() throws Exception {
        @SuppressWarnings("unchecked")
        ObjectProvider<S3Client> provider = mock(ObjectProvider.class);
        S3Client client = mock(S3Client.class);
        when(provider.getIfAvailable()).thenReturn(client);
        S3Service service = new S3Service(provider);
        ReflectionTestUtils.setField(service, "publicUrl", "   ");
        ReflectionTestUtils.setField(service, "bucketName", "kurage-bucket");

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> service.uploadAvatar(file(), UUID.randomUUID())
        );

        assertTrue(exception.getMessage().contains("public URL is not configured"));
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
        S3Service service = new S3Service(provider);
        ReflectionTestUtils.setField(service, "publicUrl", "https://cdn.example.com/");
        ReflectionTestUtils.setField(service, "bucketName", "kurage-bucket");
        UUID userId = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");

        String uploadedUrl = service.uploadAvatar(file(), userId);

        assertTrue(uploadedUrl.startsWith(
                "https://cdn.example.com/avatars/123e4567-e89b-12d3-a456-426614174000?v="
        ));
        verify(client).putObject(
                any(software.amazon.awssdk.services.s3.model.PutObjectRequest.class),
                any(software.amazon.awssdk.core.sync.RequestBody.class)
        );
    }

    private MockMultipartFile file() {
        return new MockMultipartFile(
                "file",
                "avatar.png",
                "image/png",
                "avatar".getBytes(StandardCharsets.UTF_8)
        );
    }
}
