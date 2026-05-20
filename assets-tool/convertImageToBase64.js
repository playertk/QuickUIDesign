const fs = require('fs')
const path = require('path')

const inputPath = process.argv[2] // 获取命令行传递的第一个参数，即输入目录或图片路径
if (!inputPath) {
  console.error('Usage: node convertImageToBase64.js <input-directory-or-file>')
  process.exit(1)
}

// 将相对路径转为绝对路径
const absolutePath = path.resolve(process.cwd(), inputPath)

// 检查输入路径是文件还是目录
if (fs.statSync(absolutePath).isFile()) {
  // 如果是文件，转换单个图片
  convertImageToBase64(absolutePath)
} else if (fs.statSync(absolutePath).isDirectory()) {
  // 如果是目录，遍历目录下的所有文件并转换
  fs.readdir(absolutePath, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err)
      process.exit(1)
    }

    files.forEach((fileName) => {
      const imagePath = path.join(absolutePath, fileName)
      // 只处理 png 和 jpg 格式的图片
      if (fs.statSync(imagePath).isFile() && /\.(png|jpg|wasm)$/i.test(fileName)) {
        convertImageToBase64(imagePath)
      }
    })
  })
} else {
  console.error('Invalid input path:', absolutePath)
  process.exit(1)
}

function convertImageToBase64(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath)
  const base64Data = imageBuffer.toString('base64')
  const imageFileName = path.basename(imagePath, path.extname(imagePath))
  const outputFile = path.join(path.dirname(imagePath), `${imageFileName}-base64.txt`)

  // 将 base64 数据保存到文件
  const prefix = imagePath.toLowerCase().endsWith('.wasm')
    ? 'data:application/wasm;base64,'
    : 'data:image/png;base64,'

  fs.writeFileSync(outputFile, `${prefix}${base64Data}`)
  console.log(`File ${imagePath} converted to base64 and saved to ${outputFile}`)
}
