const fs = require('fs')
const path = require('path')

class HTMLMerger {
  constructor() {
    this.sourceDir = ''
  }

  async createAndMinifyHTMLMenu(sourceHTMLFile, targetDir) {
    try {
      this.sourceDir = path.dirname(sourceHTMLFile)

      let content = await fs.promises.readFile(sourceHTMLFile, 'utf8')
      content = content.replace(/\r/g, '').replace(/\t/g, '')

      const lines = content.split('\n')
      let result = ''

      for (const line of lines) {
        const processedLine = await this.processLine(line)
        result += processedLine
      }

      const targetFile = path.join(targetDir, path.basename(sourceHTMLFile))
      await fs.promises.writeFile(targetFile, result)

      console.log(`✅ 合并完成: ${targetFile}`)
      return true
    } catch (error) {
      console.error('❌ 合并失败:', error.message)
      return false
    }
  }

  async processLine(line) {
    // 处理JavaScript文件
    if (line.includes('<script') && line.includes('</script>') && (line.includes('.js"') || line.includes(".js'"))) {
      return await this.processJavaScript(line)
    }

    // 处理CSS文件
    if (
      line.includes('<link') &&
      (line.includes('.css"') || line.includes(".css'")) &&
      (line.includes('href="') || line.includes("href='"))
    ) {
      return await this.processCSS(line)
    }

    // 处理HTML注释
    if (line.includes('//')) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('//')) {
        return line
      }
      return ''
    }

    // 处理图片
    if (line.includes('<img')) {
      return await this.processHTMLImages(line)
    }

    return line
  }

  async processJavaScript(line) {
    const cleanLine = line.replace('type="text/javascript"', '')

    const jsMatch = cleanLine.match(/src=["']([^"']+\.js)["']/)
    if (!jsMatch) return line

    const jsFile = jsMatch[1]
    const jsPath = path.join(this.sourceDir, jsFile)

    if (!fs.existsSync(jsPath)) {
      console.warn(`⚠️ 无法读取JS文件: ${jsPath}`)
      return line
    }

    try {
      let jsContent = await fs.promises.readFile(jsPath, 'utf8')
      jsContent = this.removeJavascriptComments(jsContent)
      return `<script>${jsContent}</script>`
    } catch (error) {
      console.warn(`⚠️ 读取JS文件失败: ${jsPath}`, error.message)
      return line
    }
  }

  async processCSS(line) {
    const cleanLine = line.replace(/\'/g, '"')

    const cssMatch = cleanLine.match(/href=["']([^"']+\.css)["']/)
    if (!cssMatch) return line

    const cssFile = cssMatch[1]
    const cssPath = path.join(this.sourceDir, cssFile)

    if (!fs.existsSync(cssPath)) {
      console.warn(`⚠️ 无法读取CSS文件: ${cssPath}`)
      return line
    }

    try {
      let cssContent = await fs.promises.readFile(cssPath, 'utf8')

      const cssDir = path.dirname(cssPath)
      cssContent = await this.replaceCSSImages(cssContent, cssDir)
      cssContent = await this.replaceCSSFonts(cssContent, cssDir)

      // 压缩CSS：移除所有空白字符和注释
      cssContent = this.minifyCSS(cssContent)

      return `<style>${cssContent}</style>`
    } catch (error) {
      console.warn(`⚠️ 读取CSS文件失败: ${cssPath}`, error.message)
      return line
    }
  }

  async replaceCSSImages(content, cssDir) {
    const urlRegex = /url\(["']?([^"')]+\.(?:png|gif|jpg|jpeg))["']?\)/gi

    let result = content
    let match

    while ((match = urlRegex.exec(content)) !== null) {
      const imageFile = match[1]
      const imagePath = path.join(cssDir, imageFile)

      if (fs.existsSync(imagePath)) {
        try {
          const imageData = await fs.promises.readFile(imagePath)
          const base64 = imageData.toString('base64')
          const ext = path.extname(imagePath).slice(1)
          const dataUrl = `data:image/${ext};base64,${base64}`

          result = result.replace(match[0], `url("${dataUrl}")`)
        } catch (error) {
          console.warn(`⚠️ 处理CSS图片失败: ${imagePath}`, error.message)
        }
      }
    }

    return result
  }

  async replaceCSSFonts(content, cssDir) {
    const fontRegex = /url\(["']?([^"')]+\.(?:woff2|woff|ttf|svg))["']?\)/gi

    let result = content
    let match

    while ((match = fontRegex.exec(content)) !== null) {
      const fontFile = match[1]
      const fontPath = path.join(cssDir, fontFile)

      if (fs.existsSync(fontPath)) {
        try {
          const fontData = await fs.promises.readFile(fontPath)
          const base64 = fontData.toString('base64')
          const ext = path.extname(fontPath).slice(1)
          const dataUrl = `data:application/x-font-${ext};charset=utf-8;base64,${base64}`

          result = result.replace(match[0], `url("${dataUrl}")`)
        } catch (error) {
          console.warn(`⚠️ 处理CSS字体失败: ${fontPath}`, error.message)
        }
      }
    }

    return result
  }

  async processHTMLImages(line) {
    const imgRegex = /src=["']([^"']+\.(?:png|gif|jpg|jpeg))["']/gi

    let result = line
    let match

    while ((match = imgRegex.exec(line)) !== null) {
      const imageFile = match[1]
      const imagePath = path.join(this.sourceDir, imageFile)

      if (fs.existsSync(imagePath)) {
        try {
          const imageData = await fs.promises.readFile(imagePath)
          const base64 = imageData.toString('base64')
          const ext = path.extname(imagePath).slice(1)
          const dataUrl = `data:image/${ext};base64,${base64}`

          result = result.replace(match[0], `src="${dataUrl}"`)
        } catch (error) {
          console.warn(`⚠️ 处理HTML图片失败: ${imagePath}`, error.message)
        }
      }
    }

    return result
  }

  removeJavascriptComments(content) {
    const lines = content.split('\n')
    let result = ''

    for (const line of lines) {
      if (line.includes('//')) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('//')) {
          result += line + '\n'
        }
      } else {
        result += line + '\n'
      }
    }

    return result
  }

  minifyCSS(css) {
    // 移除CSS注释
    css = css.replace(/\/\*[\s\S]*?\*\//g, '')

    // 移除所有空白字符（换行、制表符、多余空格）
    css = css.replace(/\s+/g, ' ')

    // 移除选择器和属性周围的多余空格
    css = css.replace(/\s*{\s*/g, '{')
    css = css.replace(/\s*}\s*/g, '}')
    css = css.replace(/\s*:\s*/g, ':')
    css = css.replace(/\s*;\s*/g, ';')
    css = css.replace(/\s*,\s*/g, ',')

    // 移除最后的分号
    css = css.replace(/;}/g, '}')

    // 移除字符串周围的空格
    css = css.replace(/\s*"\s*/g, '"')
    css = css.replace(/\s*'\s*/g, "'")

    // 移除单位前的空格
    css = css.replace(/\s+(!important)/g, '$1')

    return css.trim()
  }
}

async function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) return false
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }
  const entries = await fs.promises.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath)
    } else {
      await fs.promises.copyFile(srcPath, destPath)
    }
  }
  return true
}

// 使用示例
async function main() {
  const merger = new HTMLMerger()

  const sourceHTML = path.join(__dirname, '../dist', 'index.html')
  const targetDir = path.join(__dirname, '../dist/merged')

  // 确保目标目录存在
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  const success = await merger.createAndMinifyHTMLMenu(sourceHTML, targetDir)

  // 同时复制静态资源目录（如 audios）到 merged 目录
  const distDir = path.resolve(__dirname, '../dist')
  for (const dir of ['audios']) {
    const srcDir = path.join(distDir, dir)
    const destDir = path.join(targetDir, dir)
    const copied = await copyDirectory(srcDir, destDir)
    if (copied) {
      console.log(`✅ 复制目录: ${dir}`)
    }
  }

  if (success) {
    console.log('🎉 HTML文件合并成功！')
  } else {
    console.log('❌ HTML文件合并失败')
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error)
}

module.exports = HTMLMerger
