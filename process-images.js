// process-images.js
const sharp = require('sharp');
const glob = require('glob');
const fs = require('fs-extra');
const path = require('path');

// --- Configuration ---
const SOURCE_DIR = 'assets/img';
const OUTPUT_DIR = 'assets/img/processed'; // A new directory to store resized images
const SIZES = [400, 800, 1200]; // Widths in pixels to generate
const QUALITY = {
    webp: 80,
    png: { compressionLevel: 8 },
    jpeg: { quality: 82, mozjpeg: true },
};

// --- Main Logic ---
async function processImages() {
    console.log('Starting image processing...');
    
    // Ensure the output directory exists and is empty
    await fs.emptyDir(OUTPUT_DIR);

    // Find all raster source images (excluding the processed output itself)
    const imagePaths = glob.sync(`${SOURCE_DIR}/**/*.{png,jpg,jpeg}`, {
        ignore: `${OUTPUT_DIR}/**/*`, // Don't re-process already processed images
    });

    if (imagePaths.length === 0) {
        console.log('No new images to process.');
        return;
    }

    console.log(`Found ${imagePaths.length} images to process.`);

    // Process each image concurrently
    const processingTasks = imagePaths.map(async (imgPath) => {
        const ext = path.extname(imgPath).toLowerCase();
        const originalFileName = path.basename(imgPath, ext);
        const isJpeg = ext === '.jpg' || ext === '.jpeg';
        const image = sharp(imgPath);

        // Generate different sizes
        for (const size of SIZES) {
            // Never upscale: small source illustrations stay at their native size
            // (the generated file may be smaller than `size`, but that is fine —
            // the browser just never picks it for a display width it can't fill).
            const resized = () => image.clone().resize({ width: size, withoutEnlargement: true });

            // --- Generate WebP (Modern format) ---
            const webpFileName = `${originalFileName}-${size}w.webp`;
            await resized()
                .webp({ quality: QUALITY.webp })
                .toFile(path.join(OUTPUT_DIR, webpFileName));

            // --- Generate same-format fallback (PNG for PNG sources, JPEG for JPEG) ---
            if (isJpeg) {
                const jpegFileName = `${originalFileName}-${size}w.jpg`;
                await resized()
                    .jpeg(QUALITY.jpeg)
                    .toFile(path.join(OUTPUT_DIR, jpegFileName));
            } else {
                const pngFileName = `${originalFileName}-${size}w.png`;
                await resized()
                    .png(QUALITY.png)
                    .toFile(path.join(OUTPUT_DIR, pngFileName));
            }
        }

        console.log(`✓ Processed ${originalFileName}`);
    });

    await Promise.all(processingTasks);
    console.log('Image processing complete!');
}

processImages().catch(console.error);