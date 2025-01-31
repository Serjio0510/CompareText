let fullDoc1 = '';
let fullDoc2 = '';

document.addEventListener("DOMContentLoaded", function () {
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
    }
});

document.getElementById('compareBtn').addEventListener('click', function() {
   
    const doc1 = document.getElementById('doc1').value;
    const doc2 = document.getElementById('doc2').value;

    // Обновляем оба документа с нумерацией строк
    const result1 = addLineNumbers(fullDoc1, false); // Эталонный документ
    const result2 = highlightChanges(fullDoc1, fullDoc2); // Сравниваемый документ

    // Отображаем оба документа с нумерацией строк
    document.getElementById('result1').innerHTML = result1;
    document.getElementById('result2').innerHTML = result2;
});

    // Очистка полей ввода и результатов
document.getElementById('clearBtn').addEventListener('click', function() {
    document.getElementById('doc1').value = '';
    document.getElementById('doc2').value = '';
    document.getElementById('result1').innerHTML = '';
    document.getElementById('result2').innerHTML = '';

    // Сброс названий файлов к исходным
    document.getElementById('fileName1').textContent = 'Эталонный документ';
    document.getElementById('fileName2').textContent = 'Сравниваемый документ';
});

document.getElementById('copyBtn').addEventListener('click', function() {
    const result2 = document.getElementById('result2').innerText;
    navigator.clipboard.writeText(result2).then(() => {
        alert('Результат скопирован в буфер обмена');
    });
});

document.getElementById('themeToggle').addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem("theme", document.body.classList.contains('dark-mode') ? "dark" : "light");
});

function highlightChanges(original, modified) {
    const lines1 = original.split("\n");
    const lines2 = modified.split("\n");
    let result2HTML = '';

    let maxLength = Math.max(lines1.length, lines2.length);
    for (let i = 0; i < maxLength; i++) {
        const line1 = lines1[i] || "";
        const line2 = lines2[i] || "";

        if (line1 !== line2) {
            const words1 = line1.split(/\s+/).filter(word => word.length > 0);
            const words2 = line2.split(/\s+/).filter(word => word.length > 0);
            let highlighted2 = "";

            for (let j = 0; j < Math.max(words1.length, words2.length); j++) {
                const word1 = words1[j] || "";
                const word2 = words2[j] || "";

                if (word1 !== word2) {
                    highlighted2 += `<span class="char-diff">${word2}</span> `;
                } else {
                    highlighted2 += `${word2} `;
                }
            }
            result2HTML += `<div class="diff-line">${i + 1}: ${highlighted2.trim()}</div>`;
        } else {
            result2HTML += `<div>${i + 1}: ${line2}</div>`;
        }
    }

    return result2HTML.trim().replace(/\n/g, "<br>") || 'Документы идентичны.';
}

function addLineNumbers(text) {
return text.split('\n').map((line, index) => `<div>${index + 1}: ${line}</div>`).join('');
}

function addLineNumbers(text, preview = true) {
    const lines = text.split('\n');
    const maxLines = preview ? 50 : Infinity;
    
    return lines
        .slice(0, maxLines)
        .map((line, index) => `<div>${index + 1}: ${line}</div>`)
        .join('') + (lines.length > maxLines ? '<div class="more-lines">...</div>' : '');
}

function setupDragAndDrop(dropZoneId, fileInputId, textAreaId, fileNameId) {
    const dropZone = document.getElementById(dropZoneId);
    const fileInput = document.getElementById(fileInputId);
    
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
        const file = e.dataTransfer.files[0];
        handleFile(file, textAreaId, fileNameId);
    });

    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        handleFile(file, textAreaId, fileNameId);
    });
}

function handleFile(file, textAreaId, fileNameId) {
    if (file) {
        document.getElementById(fileNameId).textContent = file.name;
        if (file.name.endsWith('.docx')) {
            handleDocx(file, textAreaId);
        } else if (file.name.endsWith('.pdf')) {
            handlePdf(file, textAreaId);
        } else {
            const reader = new FileReader();
            reader.onload = function (e) {
                const text = e.target.result;
                document.getElementById(textAreaId).value = text;
                
                // Сохраняем полный текст и показываем превью
                if (textAreaId === 'doc1') {
                    fullDoc1 = text;
                    document.getElementById('result1').innerHTML = addLineNumbers(text);
                } else {
                    fullDoc2 = text;
                    document.getElementById('result2').innerHTML = addLineNumbers(text);
                }
            };
            reader.readAsText(file);
        }
    }
}


function handleDocx(file, textAreaId) {
    const reader = new FileReader();
    reader.onload = function (e) {
        mammoth.extractRawText({arrayBuffer: e.target.result})
            .then(function(result){
                const text = result.value;
                document.getElementById(textAreaId).value = text;
                // Обновляем результат только для текущего документа
                if (textAreaId === 'doc1') {
                    document.getElementById('result1').innerHTML = addLineNumbers(text);
                } else if (textAreaId === 'doc2') {
                    document.getElementById('result2').innerHTML = addLineNumbers(text);
                }
            })
            .catch(function(error) {
                console.error(error);
            });
    };
    reader.readAsArrayBuffer(file);
}

function handlePdf(file, textAreaId) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const loadingTask = pdfjsLib.getDocument({data: e.target.result});
        loadingTask.promise.then(function(pdf) {
            let text = '';
            const extractText = (page) => {
                return page.getTextContent().then(function(textContent) {
                    text += textContent.items.map(item => item.str).join(' ');
                    if (page.pageNumber < pdf.numPages) {
                        return pdf.getPage(page.pageNumber + 1).then(extractText);
                    } else {
                        document.getElementById(textAreaId).value = text;
                        // Обновляем результат только для текущего документа
                        if (textAreaId === 'doc1') {
                            document.getElementById('result1').innerHTML = addLineNumbers(text);
                        } else if (textAreaId === 'doc2') {
                            document.getElementById('result2').innerHTML = addLineNumbers(text);
                        }
                    }
                });
            };
            pdf.getPage(1).then(extractText);
        });
    };
    reader.readAsArrayBuffer(file);
}

setupDragAndDrop("dropZone1", "file1", "doc1", "fileName1");
setupDragAndDrop("dropZone2", "file2", "doc2", "fileName2");

//serviceWorker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/CompareText/sw.js').then((registration) => {
        console.log('Service Worker зарегистрирован с областью:', registration.scope);
      }).catch((error) => {
        console.log('Ошибка регистрации Service Worker:', error);
      });
    });
  }