let fullDoc1 = '';
let fullDoc2 = '';
const PREVIEW_LINES = 5; // Количество строк в предпросмотре

document.addEventListener("DOMContentLoaded", function () {
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
    }
});

// Обновление предпросмотра при вводе вручную
document.getElementById('doc1').addEventListener('input', function () {
    fullDoc1 = this.value;
    document.getElementById('result1').innerHTML = addLineNumbers(fullDoc1, true);
});

document.getElementById('doc2').addEventListener('input', function () {
    fullDoc2 = this.value;
    document.getElementById('result2').innerHTML = addLineNumbers(fullDoc2, true);
});

// Нажатие на кнопку "Сравнить"
document.getElementById('compareBtn').addEventListener('click', function() {
    if (!fullDoc1 || !fullDoc2) {
        alert("Введите текст или загрузите файлы для сравнения!");
        return;
    }

    // Отображаем полный текст
    document.getElementById('result1').innerHTML = addLineNumbers(fullDoc1, false);
    document.getElementById('result2').innerHTML = highlightChanges(fullDoc1, fullDoc2);
});

// Очистка полей
document.getElementById('clearBtn').addEventListener('click', function() {
    document.getElementById('doc1').value = '';
    document.getElementById('doc2').value = '';
    document.getElementById('result1').innerHTML = '';
    document.getElementById('result2').innerHTML = '';
    fullDoc1 = '';
    fullDoc2 = '';
});

// Функция для добавления нумерации строк
function addLineNumbers(text, preview = false) {
    const lines = text.split('\n');
    const displayLines = preview ? lines.slice(0, PREVIEW_LINES) : lines;
    
    return displayLines
        .map((line, index) => `<div>${index + 1}: ${line}</div>`)
        .join('') + (preview && lines.length > PREVIEW_LINES ? '<div class="more-lines">...</div>' : '');
}

// Функция для сравнения строк и выделения отличий
function highlightChanges(original, modified) {
    const lines1 = original.split("\n");
    const lines2 = modified.split("\n");
    let result2HTML = '';

    let maxLength = Math.max(lines1.length, lines2.length);
    for (let i = 0; i < maxLength; i++) {
        const line1 = lines1[i] || "";
        const line2 = lines2[i] || "";

        if (line1 !== line2) {
            let highlighted2 = "";
            for (let j = 0; j < Math.max(line1.length, line2.length); j++) {
                const char1 = line1[j] || "";
                const char2 = line2[j] || "";

                if (char1 !== char2) {
                    highlighted2 += `<span class="char-diff">${char2}</span>`;
                } else {
                    highlighted2 += char2;
                }
            }
            result2HTML += `<div class="diff-line">${i + 1}: ${highlighted2}</div>`;
        } else {
            result2HTML += `<div>${i + 1}: ${line2}</div>`;
        }
    }

    return result2HTML.trim() || 'Документы идентичны.';
}

// Настройка загрузки файлов
function setupDragAndDrop(dropZoneId, fileInputId, textAreaId, fileNameId, isDoc1) {
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
        handleFile(file, textAreaId, fileNameId, isDoc1);
    });

    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        handleFile(file, textAreaId, fileNameId, isDoc1);
    });
}

function handleFile(file, textAreaId, fileNameId, isDoc1) {
    if (file) {
        document.getElementById(fileNameId).textContent = file.name;
        const reader = new FileReader();

        if (file.name.endsWith('.docx')) {
            reader.onload = function (e) {
                mammoth.extractRawText({ arrayBuffer: e.target.result })
                    .then(function (result) {
                        processText(result.value, textAreaId, isDoc1);
                    })
                    .catch(function (error) {
                        console.error("Ошибка обработки DOCX:", error);
                    });
            };
            reader.readAsArrayBuffer(file);
        } else if (file.name.endsWith('.pdf')) {
            reader.onload = function (e) {
                const loadingTask = pdfjsLib.getDocument({ data: e.target.result });
                loadingTask.promise.then(function (pdf) {
                    let text = '';
                    const processPage = (page) => {
                        return page.getTextContent().then(function (textContent) {
                            text += textContent.items.map(item => item.str).join(' ') + "\n";
                            if (page.pageNumber < pdf.numPages) {
                                return pdf.getPage(page.pageNumber + 1).then(processPage);
                            } else {
                                processText(text, textAreaId, isDoc1);
                            }
                        });
                    };
                    pdf.getPage(1).then(processPage);
                });
            };
            reader.readAsArrayBuffer(file);
        } else {
            reader.onload = function (e) {
                processText(e.target.result, textAreaId, isDoc1);
            };
            reader.readAsText(file);
        }
    }
}

function processText(text, textAreaId, isDoc1) {
    document.getElementById(textAreaId).value = text;
    
    if (isDoc1) {
        fullDoc1 = text;
        document.getElementById('result1').innerHTML = addLineNumbers(text, true);
    } else {
        fullDoc2 = text;
        document.getElementById('result2').innerHTML = addLineNumbers(text, true);
    }
}

setupDragAndDrop("dropZone1", "file1", "doc1", "fileName1", true);
setupDragAndDrop("dropZone2", "file2", "doc2", "fileName2", false);

// Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/CompareText/sw.js').then((registration) => {
            console.log('Service Worker зарегистрирован:', registration.scope);
        }).catch((error) => {
            console.log('Ошибка регистрации Service Worker:', error);
        });
    });
}
