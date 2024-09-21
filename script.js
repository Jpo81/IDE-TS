require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.32.0/min/vs' }});
require(['vs/editor/editor.main'], function() {
    const editor = monaco.editor.create(document.getElementById('editor'), {
        value: `console.log("Hello, world!");`,
        language: 'typescript',
        theme: 'vs-dark'
    });

    const runButton = document.getElementById('run-button');
    const stopButton = document.getElementById('stop-button');
    const outputDiv = document.getElementById('output');
    const fileList = document.getElementById('file-list');
    const newFileButton = document.getElementById('new-file-button');
    const uploadButton = document.getElementById('upload-button');
    const downloadButton = document.getElementById('download-button');
    const fileInput = document.getElementById('file-input');

    let files = {};

    function updateOutput(message) {
        outputDiv.innerHTML = message;
    }

    function renderFileList() {
        fileList.innerHTML = '';
        for (const name in files) {
            const li = document.createElement('li');
            li.textContent = name + '.ts';
            li.draggable = true;

            li.ondragstart = (event) => {
                event.dataTransfer.setData('text/plain', name);
            };

            li.onclick = () => {
                editor.setValue(files[name]);
            };

            li.ondragover = (event) => {
                event.preventDefault();
            };

            li.ondrop = (event) => {
                event.preventDefault();
                const draggedFileName = event.dataTransfer.getData('text/plain');
                moveFile(draggedFileName, name);
            };

            li.oncontextmenu = (event) => {
                event.preventDefault();
                if (confirm(`Deseja excluir o arquivo "${name}.ts"?`)) {
                    delete files[name];
                    renderFileList();
                }
            };

            fileList.appendChild(li);
        }
    }

    function moveFile(fileName, targetFile) {
        const fileContent = files[fileName];
        delete files[fileName];
        files[targetFile] = fileContent;
        renderFileList();
    }

    newFileButton.onclick = () => {
        const filename = prompt("Nome do novo arquivo (ex: arquivo.ts):");
        if (filename && !files[filename]) {
            files[filename] = '';
            renderFileList();
        } else {
            alert('Arquivo já existe ou nome inválido.');
        }
    };

    uploadButton.onclick = () => {
        fileInput.click();
    };

    fileInput.onchange = (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            const filename = file.name.split('.').slice(0, -1).join('.') || 'arquivo';
            if (files[filename]) {
                if (!confirm(`Arquivo "${filename}.ts" já existe. Deseja sobrescrever?`)) {
                    return;
                }
            }
            files[filename] = e.target.result;
            renderFileList();
        };
        if (file) {
            reader.readAsText(file);
        }
    };

    downloadButton.onclick = () => {
        const filename = prompt("Nome do arquivo para salvar (deixe vazio para usar o nome atual):");
        const content = editor.getValue();
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (filename || 'arquivo.ts');
        a.click();
        URL.revokeObjectURL(url);
    };

    let isRunning = false;

    function isValidCode(code) {
        const forbiddenPatterns = [
            /eval\(/g,
            /fetch\(/g
        ];
        return !forbiddenPatterns.some((pattern) => pattern.test(code));
    }

    runButton.addEventListener('click', () => {
        if (isRunning) {
            return;
        }

        const tsCode = editor.getValue();
        
        if (!isValidCode(tsCode)) {
            updateOutput('<span style="color: red;">Erro: Código contém comandos não permitidos!</span>');
            return;
        }

        updateOutput('Executando código...');
        isRunning = true;

        let jsCode;
        try {
            jsCode = ts.transpileModule(tsCode, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
        } catch (transpilationError) {
            updateOutput(`<span style="color: red;">Erro de Transpiração: ${transpilationError.message}</span>`);
            isRunning = false;
            return;
        }

        try {
            const outputBuffer = [];
            const originalLog = console.log;
            console.log = (...args) => {
                outputBuffer.push(args.join(' '));
            };

            const func = new Function(jsCode);
            func();
            console.log = originalLog;

            updateOutput(outputBuffer.length > 0 ? outputBuffer.join('<br>') : 'Nenhum output.');
        } catch (executionError) {
            updateOutput(`<span style="color: red;">Erro de Execução: ${executionError.message}</span>`);
        } finally {
            isRunning = false;
            runButton.style.display = 'inline';
            stopButton.style.display = 'inline';
        }
    });

    stopButton.addEventListener('click', () => {
        updateOutput('Execução parada.');
        stopButton.style.display = 'none';
        isRunning = false;
        outputDiv.innerHTML = '';
    });

    renderFileList();
});
