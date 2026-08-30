package com.kurage.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class S3Service {

    private final ObjectProvider<S3Client> s3ClientProvider;
    private final ImageUploadService imageUploadService;

    @Value("${cloudflare.r2.bucket-name:kurage-bucket}")
    private String bucketName;

    @Value("${cloudflare.r2.public-url:}")
    private String publicUrl;

    public String uploadAvatar(MultipartFile file, UUID userId) {
        return uploadImage(imageUploadService.normalize(file), "avatars", requireId(userId));
    }

    public String uploadAvatar(byte[] content, UUID userId) {
        return uploadImage(imageUploadService.normalize(content), "avatars", requireId(userId));
    }

    public String uploadTeamLogo(MultipartFile file, UUID teamId) {
        return uploadImage(imageUploadService.normalize(file), "team-logos", requireId(teamId));
    }

    private String uploadImage(ImageUploadService.NormalizedImage image, String namespace, UUID ownerId) {
        S3Client s3Client = s3ClientProvider.getIfAvailable();
        if (s3Client == null) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "O armazenamento de imagens ainda não está configurado."
            );
        }

        if (publicUrl == null || publicUrl.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "A URL pública do armazenamento de imagens ainda não está configurada."
            );
        }

        String key = namespace + "/" + ownerId + "/" + UUID.randomUUID() + ".png";

        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(ImageUploadService.OUTPUT_CONTENT_TYPE)
                    .contentDisposition("inline")
                    .cacheControl("public, max-age=31536000, immutable")
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(image.content()));

            return normalizedPublicBaseUrl() + "/" + key;

        } catch (S3Exception e) {
            if (e.statusCode() == HttpStatus.FORBIDDEN.value()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "O Cloudflare R2 recusou o upload (403). A chave S3 precisa de permissões Object Read & Write para o bucket configurado.",
                        e
                );
            }
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "O armazenamento de imagens não aceitou o upload. Verifique as credenciais e o bucket do Cloudflare R2.",
                    e
            );
        } catch (SdkException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "O armazenamento de imagens está temporariamente indisponível.",
                    e
            );
        }
    }

    /** Best-effort cleanup used after a successful DB commit or a failed DB write. */
    public void deleteImageIfOwned(String imageUrl) {
        String key = extractOwnedKey(imageUrl);
        if (key == null) {
            return;
        }
        S3Client s3Client = s3ClientProvider.getIfAvailable();
        if (s3Client == null) {
            log.warn("Could not clean up image {} because R2 is unavailable", key);
            return;
        }
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build());
        } catch (RuntimeException exception) {
            log.warn("Could not clean up previous R2 image {}: {}", key, exception.getClass().getSimpleName());
        }
    }

    private String extractOwnedKey(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank() || publicUrl == null || publicUrl.isBlank()) {
            return null;
        }
        String prefix = normalizedPublicBaseUrl() + "/";
        if (!imageUrl.startsWith(prefix)) {
            return null;
        }
        String key = imageUrl.substring(prefix.length());
        int queryIndex = key.indexOf('?');
        if (queryIndex >= 0) {
            key = key.substring(0, queryIndex);
        }
        if (!key.startsWith("avatars/") && !key.startsWith("team-logos/")) {
            return null;
        }
        if (key.isBlank() || key.contains("..") || key.indexOf('\\') >= 0) {
            return null;
        }
        return key;
    }

    private String normalizedPublicBaseUrl() {
        return publicUrl.endsWith("/") ? publicUrl.substring(0, publicUrl.length() - 1) : publicUrl;
    }

    private static UUID requireId(UUID id) {
        if (id == null) {
            throw new IllegalArgumentException("O identificador da imagem é obrigatório.");
        }
        return id;
    }
}
