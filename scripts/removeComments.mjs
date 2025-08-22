import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const fileExtensions = {
  js: ['.js', '.jsx', '.ts', '.tsx', '.mjs'],
  css: ['.css'],
  json: ['.json'],
  md: ['.md']
};
function removeJSComments(content) {
  content = content.replace(/\/\/.*$/gm, '');
  content = content.replace(/\/\*[\s\S]*?\*\
  content = content.replace(/^\s*\n/gm, '');
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
  return content;
}
function removeCSSComments(content) {
  content = content.replace(/\/\*[\s\S]*?\*\
  content = content.replace(/^\s*\n/gm, '');
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
  return content;
}
function removeJSONComments(content) {
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    return content.replace(/\/\/.*$/gm, '');
  }
}
function removeMDComments(content) {
  content = content.replace(/<!--[\s\S]*?-->/g, '');
  return content;
}
function getFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (fileExtensions.js.includes(ext)) return 'js';
  if (fileExtensions.css.includes(ext)) return 'css';
  if (fileExtensions.json.includes(ext)) return 'json';
  if (fileExtensions.md.includes(ext)) return 'md';
  return null;
}
function processFile(filePath) {
  const fileType = getFileType(filePath);
  if (!fileType) return false;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let processedContent = content;
    switch (fileType) {
      case 'js':
        processedContent = removeJSComments(content);
        break;
      case 'css':
        processedContent = removeCSSComments(content);
        break;
      case 'json':
        processedContent = removeJSONComments(content);
        break;
      case 'md':
        processedContent = removeMDComments(content);
        break;
    }
    if (processedContent !== content) {
      fs.writeFileSync(filePath, processedContent, 'utf8');
      console.log(`✅ Commentaires supprimés: ${path.relative(projectRoot, filePath)}`);
      return true;
    } else {
      console.log(`ℹ️  Aucun commentaire trouvé: ${path.relative(projectRoot, filePath)}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Erreur lors du traitement de ${filePath}:`, error.message);
    return false;
  }
}
function walkDirectory(dir, excludeDirs = ['node_modules', '.git', '.next', 'dist', 'build']) {
  const files = [];
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (!excludeDirs.includes(item)) {
          files.push(...walkDirectory(fullPath, excludeDirs));
        }
      } else {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la lecture du répertoire ${dir}:`, error.message);
  }
  return files;
}
function main() {
  console.log('🚀 Démarrage de la suppression des commentaires...\n');
  const allFiles = walkDirectory(projectRoot);
  const processedFiles = [];
  let modifiedCount = 0;
  for (const filePath of allFiles) {
    const wasModified = processFile(filePath);
    if (wasModified) {
      modifiedCount++;
      processedFiles.push(filePath);
    }
  }
  console.log(`\n📊 Résumé:`);
  console.log(`   • Fichiers analysés: ${allFiles.filter(f => getFileType(f)).length}`);
  console.log(`   • Fichiers modifiés: ${modifiedCount}`);
  console.log(`   • Types de fichiers traités: JS/TS/TSX, CSS, JSON, MD`);
  if (processedFiles.length > 0) {
    console.log(`\n📝 Fichiers modifiés:`);
    processedFiles.forEach(file => {
      console.log(`   • ${path.relative(projectRoot, file)}`);
    });
  }
  console.log('\n✨ Suppression des commentaires terminée !');
}
main();
