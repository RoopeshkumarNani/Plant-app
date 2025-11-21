const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function createTestImages() {
  const uploadDir = path.join(__dirname, 'uploads');
  
  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("í³ Created uploads directory");
  }
  
  // Create a green test image for "Mona" (Monstera)
  const greenImage = await sharp({
    create: {
      width: 400,
      height: 400,
      channels: 3,
      background: { r: 34, g: 106, b: 79 }  // Nice green
    }
  })
  .composite([
    {
      input: {
        text: {
          text: 'íº´ Mona\nMonstera Deliciosa',
          font: 'Arial',
          fontsize: 48,
          fill: '#ffffff'
        }
      },
      left: 50,
      top: 150
    }
  ])
  .webp({ quality: 80 })
  .toBuffer();
  
  // Create a lighter green test image for "Peter" (Pothos)
  const lightGreenImage = await sharp({
    create: {
      width: 400,
      height: 400,
      channels: 3,
      background: { r: 122, g: 196, b: 136 }  // Light green
    }
  })
  .composite([
    {
      input: {
        text: {
          text: 'í¼¿ Peter\nPothos',
          font: 'Arial',
          fontsize: 48,
          fill: '#ffffff'
        }
      },
      left: 50,
      top: 150
    }
  ])
  .webp({ quality: 80 })
  .toBuffer();
  
  // Save the images
  fs.writeFileSync(path.join(uploadDir, 'mona-1.webp'), greenImage);
  fs.writeFileSync(path.join(uploadDir, 'peter-1.webp'), lightGreenImage);
  
  console.log("âœ… Test images created!");
  console.log("   - mona-1.webp (" + greenImage.length + " bytes)");
  console.log("   - peter-1.webp (" + lightGreenImage.length + " bytes)");
}

createTestImages().catch(err => {
  console.error("âŒ Error creating test images:", err.message);
});
