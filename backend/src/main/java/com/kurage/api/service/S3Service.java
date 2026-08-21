package com.kurage.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.IOException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class S3Service {

    private final ObjectProvider<S3Client> s3ClientProvider;

    @Value("${cloudflare.r2.bucket-name:kurage-bucket}")
    private String bucketName;

    @Value("${cloudflare.r2.public-url:}")
    private String publicUrl;

    public String uploadAvatar(MultipartFile file, UUID userId) throws IOException {
        S3Client s3Client = s3ClientProvider.getIfAvailable();
        if (s3Client == null) {
            throw new IllegalStateException(
                    "Cloudflare R2 storage is not configured. Configure access key, secret key and endpoint before uploading files."
            );
        }

        if (publicUrl == null || publicUrl.isBlank()) {
            throw new IllegalStateException(
                    "Cloudflare R2 public URL is not configured. Configure it before uploading files."
            );
        }

        // Ex: avatars/123e4567-e89b-12d3-a456-426614174000
        // Omitimos a extensão para garantir que o R2 sempre sobrescreva o mesmo arquivo.
        // O navegador renderiza corretamente pois o Content-Type é enviado no putObjectRequest.
        String key = "avatars/" + userId.toString();

        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(file.getContentType())
                    // R2 pode ignorar a ACL pública se o bucket já for público, mas é bom enviar
                    // Se der erro de ACL no R2, remova esta linha
                    // .acl(ObjectCannedACL.PUBLIC_READ) 
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            String finalUrl = publicUrl.endsWith("/") ? publicUrl + key : publicUrl + "/" + key;
            // Append a cache buster timestamp to ensure Cloudflare delivers the newly uploaded file instantly
            finalUrl = finalUrl + "?v=" + System.currentTimeMillis();
            return finalUrl;

        } catch (S3Exception e) {
            System.err.println("Erro ao fazer upload no R2: " + e.awsErrorDetails().errorMessage());
            throw new RuntimeException("Failed to upload file to Cloudflare R2", e);
        }
    }
}
