package com.kurage.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

import java.net.URI;

@Configuration
public class S3Config {

    @Value("${cloudflare.r2.access-key:}")
    private String accessKey;

    @Value("${cloudflare.r2.secret-key:}")
    private String secretKey;

    @Value("${cloudflare.r2.endpoint:}")
    private String endpoint;

    @Bean
    @Conditional(R2ConfiguredCondition.class)
    public S3Client s3Client() {
        if (accessKey.isBlank() || secretKey.isBlank() || endpoint.isBlank()) {
            throw new IllegalStateException(
                    "Cloudflare R2 configuration is incomplete: access key, secret key and endpoint must all be set."
            );
        }

        URI endpointUri = URI.create(endpoint);
        if (!"https".equalsIgnoreCase(endpointUri.getScheme())
                || endpointUri.getHost() == null
                || (endpointUri.getPath() != null && !endpointUri.getPath().isBlank() && !"/".equals(endpointUri.getPath()))) {
            throw new IllegalStateException(
                    "Cloudflare R2 endpoint must be https://<ACCOUNT_ID>.r2.cloudflarestorage.com without the bucket name."
            );
        }

        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);

        return S3Client.builder()
            .endpointOverride(endpointUri)
            .credentialsProvider(StaticCredentialsProvider.create(credentials))
            .region(Region.of("auto"))
            .forcePathStyle(true) // Prevents SSL wildcard mismatch on multi-level subdomains
            .build();
    }

    public static final class R2ConfiguredCondition implements Condition {

        @Override
        public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
            return StringUtils.hasText(context.getEnvironment().getProperty("cloudflare.r2.access-key"))
                    && StringUtils.hasText(context.getEnvironment().getProperty("cloudflare.r2.secret-key"))
                    && StringUtils.hasText(context.getEnvironment().getProperty("cloudflare.r2.endpoint"));
        }
    }
}
