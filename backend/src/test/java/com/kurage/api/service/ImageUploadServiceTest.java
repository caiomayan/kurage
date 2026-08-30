package com.kurage.api.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ImageUploadServiceTest {

    private final ImageUploadService service = new ImageUploadService();

    @Test
    void decodesActualContentAndReencodesItAsA512Png() throws Exception {
        byte[] jpeg = imageBytes(800, 400, BufferedImage.TYPE_INT_RGB, "jpeg");
        MockMultipartFile disguisedMime = new MockMultipartFile(
                "file", "avatar.bin", "application/octet-stream", jpeg);

        var normalized = service.normalize(disguisedMime);
        BufferedImage output = ImageIO.read(new ByteArrayInputStream(normalized.content()));

        assertEquals(ImageUploadService.OUTPUT_SIZE, output.getWidth());
        assertEquals(ImageUploadService.OUTPUT_SIZE, output.getHeight());
        assertTrue(normalized.content().length > 8);
        assertEquals((byte) 0x89, normalized.content()[0]);
        assertEquals((byte) 0x50, normalized.content()[1]);
        assertEquals((byte) 0x4E, normalized.content()[2]);
        assertEquals((byte) 0x47, normalized.content()[3]);
    }

    @Test
    void rejectsTextEvenWhenItClaimsToBePng() {
        MockMultipartFile fake = new MockMultipartFile(
                "file", "avatar.png", "image/png", "not-an-image".getBytes());

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.normalize(fake));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    void rejectsAnimatedAndUnsupportedFormats() throws Exception {
        byte[] gif = imageBytes(16, 16, BufferedImage.TYPE_INT_RGB, "gif");

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.normalize(gif));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    void rejectsFilesOverFiveMegabytesBeforeDecoding() {
        byte[] oversized = new byte[(int) ImageUploadService.MAX_UPLOAD_BYTES + 1];

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.normalize(oversized));

        assertEquals(HttpStatus.CONTENT_TOO_LARGE, exception.getStatusCode());
    }

    @Test
    void rejectsExcessiveSourceDimensionsBeforePixelDecode() throws Exception {
        byte[] tooWide = imageBytes(
                ImageUploadService.MAX_SOURCE_DIMENSION + 1,
                1,
                BufferedImage.TYPE_INT_RGB,
                "png");

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.normalize(tooWide));

        assertEquals(HttpStatus.CONTENT_TOO_LARGE, exception.getStatusCode());
    }

    private static byte[] imageBytes(int width, int height, int type, String format) throws Exception {
        BufferedImage image = new BufferedImage(width, height, type);
        var graphics = image.createGraphics();
        graphics.setColor(Color.MAGENTA);
        graphics.fillRect(0, 0, width, height);
        graphics.dispose();

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        assertTrue(ImageIO.write(image, format, output));
        return output.toByteArray();
    }
}
