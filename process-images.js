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
};

// --- Main Logic ---
async function processImages() {
    console.log('Starting image processing...');
    
    // Ensure the output directory exists and is empty
    await fs.emptyDir(OUTPUT_DIR);

    // Find all PNG files in the source directory (excluding existing processed ones)
    const imagePaths = glob.sync(`${SOURCE_DIR}/**/*.png`, {
        ignore: `${OUTPUT_DIR}/**/*`, // Don't re-process already processed images
    });

    if (imagePaths.length === 0) {
        console.log('No new images to process.');
        return;
    }

    console.log(`Found ${imagePaths.length} images to process.`);

    // Process each image concurrently
    const processingTasks = imagePaths.map(async (imgPath) => {
        const originalFileName = path.basename(imgPath, path.extname(imgPath));
        const image = sharp(imgPath);

        // Generate different sizes
        for (const size of SIZES) {
            // --- Generate WebP (Modern format) ---
            const webpFileName = `${originalFileName}-${size}w.webp`;
            await image
                .resize({ width: size })
                .webp({ quality: QUALITY.webp })
                .toFile(path.join(OUTPUT_DIR, webpFileName));

            // --- Generate PNG (Fallback format) ---
            const pngFileName = `${originalFileName}-${size}w.png`;
            await image
                .resize({ width: size })
                .png(QUALITY.png)
                .toFile(path.join(OUTPUT_DIR, pngFileName));
        }
        
        console.log(`✓ Processed ${originalFileName}`);
    });

    await Promise.all(processingTasks);
    console.log('Image processing complete!');
}

processImages().catch(console.error);