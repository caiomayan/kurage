package com.kurage.api.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import javax.imageio.ImageReadParam;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;

@Service
public class ImageUploadService {

    public static final long MAX_UPLOAD_BYTES = 5L * 1024L * 1024L;
    public static final int MAX_SOURCE_DIMENSION = 4_096;
    public static final long MAX_SOURCE_PIXELS = 16_000_000L;
    public static final int OUTPUT_SIZE = 512;
    public static final String OUTPUT_CONTENT_TYPE = "image/png";

    private static final Set<String> ALLOWED_FORMATS = Set.of("PNG", "JPEG", "JPG");

    static {
        // Uploaded files are already bounded and should never spill ImageIO
        // caches to a shared temporary directory.
        ImageIO.setUseCache(false);
    }

    public NormalizedImage normalize(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw invalid("Selecione uma imagem PNG ou JPG.");
        }
        if (file.getSize() > MAX_UPLOAD_BYTES) {
            throw tooLarge();
        }
        try {
            return normalize(file.getBytes());
        } catch (IOException exception) {
            throw invalid("Não foi possível ler a imagem enviada.", exception);
        }
    }

    public NormalizedImage normalize(byte[] content) {
        if (content == null || content.length == 0) {
            throw invalid("Selecione uma imagem PNG ou JPG.");
        }
        if (content.length > MAX_UPLOAD_BYTES) {
            throw tooLarge();
        }

        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(content))) {
            if (input == null) {
                throw invalid("O arquivo enviado não é uma imagem válida.");
            }

            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw invalid("O arquivo enviado não é uma imagem PNG ou JPG válida.");
            }

            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                String format = reader.getFormatName().toUpperCase(Locale.ROOT);
                if (!ALLOWED_FORMATS.contains(format)) {
                    throw invalid("Use uma imagem PNG ou JPG.");
                }

                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                validateDimensions(width, height);

                ImageReadParam readParam = reader.getDefaultReadParam();
                int largestDimension = Math.max(width, height);
                int subsampling = Math.max(1, (largestDimension + 2_047) / 2_048);
                if (subsampling > 1) {
                    readParam.setSourceSubsampling(subsampling, subsampling, 0, 0);
                }

                BufferedImage decoded = reader.read(0, readParam);
                if (decoded == null) {
                    throw invalid("Não foi possível decodificar a imagem enviada.");
                }
                return new NormalizedImage(encodeNormalizedPng(decoded));
            } finally {
                reader.dispose();
            }
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (IOException | RuntimeException exception) {
            throw invalid("O arquivo enviado está corrompido ou não é uma imagem suportada.", exception);
        }
    }

    private static void validateDimensions(int width, int height) {
        long pixels = (long) width * height;
        if (width < 1 || height < 1) {
            throw invalid("A imagem não possui dimensões válidas.");
        }
        if (width > MAX_SOURCE_DIMENSION
                || height > MAX_SOURCE_DIMENSION
                || pixels > MAX_SOURCE_PIXELS) {
            throw new ResponseStatusException(
                    HttpStatus.CONTENT_TOO_LARGE,
                    "A imagem deve ter no máximo 4096 pixels por lado e 16 milhões de pixels no total."
            );
        }
    }

    private static byte[] encodeNormalizedPng(BufferedImage source) throws IOException {
        BufferedImage normalized = new BufferedImage(OUTPUT_SIZE, OUTPUT_SIZE, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = normalized.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            double scale = Math.min(
                    (double) OUTPUT_SIZE / source.getWidth(),
                    (double) OUTPUT_SIZE / source.getHeight()
            );
            int targetWidth = Math.max(1, (int) Math.round(source.getWidth() * scale));
            int targetHeight = Math.max(1, (int) Math.round(source.getHeight() * scale));
            int x = (OUTPUT_SIZE - targetWidth) / 2;
            int y = (OUTPUT_SIZE - targetHeight) / 2;
            graphics.drawImage(source, x, y, targetWidth, targetHeight, null);
        } finally {
            graphics.dispose();
        }

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        if (!ImageIO.write(normalized, "png", output)) {
            throw new IOException("PNG encoder is unavailable");
        }
        return output.toByteArray();
    }

    private static ResponseStatusException tooLarge() {
        return new ResponseStatusException(
                HttpStatus.CONTENT_TOO_LARGE,
                "A imagem deve ter no máximo 5 MB."
        );
    }

    private static ResponseStatusException invalid(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static ResponseStatusException invalid(String message, Exception cause) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message, cause);
    }

    public record NormalizedImage(byte[] content) {
    }
}
