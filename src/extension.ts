import * as vscode from 'vscode';

// Comment patterns for different languages
const COMMENT_PATTERNS = {
    javascript: {
        singleLine: /\/\/.*$/gm,
        multiLine: /\/\*[\s\S]*?\*\//g,
        extensions: ['.js', '.jsx', '.ts', '.tsx']
    },
    python: {
        singleLine: /#.*$/gm,
        multiLine: /'''[\s\S]*?'''|"""[\s\S]*?"""/g,
        extensions: ['.py']
    },
    html: {
        singleLine: null,
        multiLine: /<!--[\s\S]*?-->/g,
        extensions: ['.html', '.htm', '.xml']
    },
    css: {
        singleLine: null,
        multiLine: /\/\*[\s\S]*?\*\//g,
        extensions: ['.css', '.scss', '.sass', '.less']
    },
    java: {
        singleLine: /\/\/.*$/gm,
        multiLine: /\/\*[\s\S]*?\*\//g,
        extensions: ['.java']
    },
    c: {
        singleLine: /\/\/.*$/gm,
        multiLine: /\/\*[\s\S]*?\*\//g,
        extensions: ['.c', '.cpp', '.h', '.hpp', '.cc', '.cxx']
    },
    shell: {
        singleLine: /#.*$/gm,
        multiLine: null,
        extensions: ['.sh', '.bash', '.zsh']
    },
    sql: {
        singleLine: /--.*$/gm,
        multiLine: /\/\*[\s\S]*?\*\//g,
        extensions: ['.sql']
    },
    ruby: {
        singleLine: /#.*$/gm,
        multiLine: /=begin[\s\S]*?=end/g,
        extensions: ['.rb']
    },
    php: {
        singleLine: /\/\/.*$|#.*$/gm,
        multiLine: /\/\*[\s\S]*?\*\//g,
        extensions: ['.php']
    }
};

function getLanguageType(fileName: string): string | null {
    const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    
    for (const [langType, config] of Object.entries(COMMENT_PATTERNS)) {
        if (config.extensions.includes(extension)) {
            return langType;
        }
    }
    return null;
}

function removeComments(text: string, languageType: string): string {
    const patterns = COMMENT_PATTERNS[languageType as keyof typeof COMMENT_PATTERNS];
    if (!patterns) {
        return text;
    }

    let result = text;

    // Remove multi-line comments first
    if (patterns.multiLine) {
        result = result.replace(patterns.multiLine, '');
    }

    // Remove single-line comments
    if (patterns.singleLine) {
        result = result.replace(patterns.singleLine, '');
    }

    // Clean up extra empty lines (more than 2 consecutive empty lines)
    result = result.replace(/\n\s*\n\s*\n/g, '\n\n');

    return result;
}

function improveComments(text: string, languageType: string): string {
    const patterns = COMMENT_PATTERNS[languageType as keyof typeof COMMENT_PATTERNS];
    if (!patterns) {
        return text;
    }

    let result = text;

    // Simple comment improvement logic
    if (patterns.singleLine) {
        // Improve single-line comments
        result = result.replace(patterns.singleLine, (match) => {
            const comment = match.trim();
            
            // Skip if already well-formatted
            if (comment.length < 10) {
                return match;
            }

            // Basic improvements
            let improved = comment
                .replace(/^\/\/\s*/, '') // Remove // and spaces
                .replace(/^#\s*/, '') // Remove # and spaces
                .replace(/^--\s*/, '') // Remove -- and spaces
                .trim();

            // Capitalize first letter
            if (improved.length > 0) {
                improved = improved.charAt(0).toUpperCase() + improved.slice(1);
            }

            // Add period if missing
            if (improved.length > 0 && !improved.endsWith('.') && !improved.endsWith('!') && !improved.endsWith('?')) {
                improved += '.';
            }

            // Return with appropriate comment syntax
            if (languageType === 'python' || languageType === 'shell' || languageType === 'ruby') {
                return `# ${improved}`;
            } else if (languageType === 'sql') {
                return `-- ${improved}`;
            } else {
                return `// ${improved}`;
            }
        });
    }

    return result;
}

export function activate(context: vscode.ExtensionContext) {
    console.log('CleanComments extension is now active!');

    // Register remove comments command
    let removeCommentsDisposable = vscode.commands.registerCommand('cleancomments.removeComments', () => {
        const editor = vscode.window.activeTextEditor;
        
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found!');
            return;
        }

        const document = editor.document;
        const fileName = document.fileName;
        const languageType = getLanguageType(fileName);

        if (!languageType) {
            vscode.window.showWarningMessage(`Unsupported file type: ${fileName.substring(fileName.lastIndexOf('.'))}`);
            return;
        }

        const text = document.getText();
        const cleanedText = removeComments(text, languageType);

        if (text === cleanedText) {
            vscode.window.showInformationMessage('No comments found to remove.');
            return;
        }

        // Replace all text in the editor
        editor.edit(editBuilder => {
            const firstLine = document.lineAt(0);
            const lastLine = document.lineAt(document.lineCount - 1);
            const textRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
            editBuilder.replace(textRange, cleanedText);
        }).then(success => {
            if (success) {
                const removedLines = text.split('\n').length - cleanedText.split('\n').length;
                vscode.window.showInformationMessage(`Comments removed successfully! ${removedLines} lines removed.`);
            } else {
                vscode.window.showErrorMessage('Failed to remove comments.');
            }
        });
    });

    // Register improve comments command
    let improveCommentsDisposable = vscode.commands.registerCommand('cleancomments.improveComments', () => {
        const editor = vscode.window.activeTextEditor;
        
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found!');
            return;
        }

        const document = editor.document;
        const fileName = document.fileName;
        const languageType = getLanguageType(fileName);

        if (!languageType) {
            vscode.window.showWarningMessage(`Unsupported file type: ${fileName.substring(fileName.lastIndexOf('.'))}`);
            return;
        }

        const text = document.getText();
        const improvedText = improveComments(text, languageType);

        if (text === improvedText) {
            vscode.window.showInformationMessage('No comments found to improve.');
            return;
        }

        // Replace all text in the editor
        editor.edit(editBuilder => {
            const firstLine = document.lineAt(0);
            const lastLine = document.lineAt(document.lineCount - 1);
            const textRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
            editBuilder.replace(textRange, improvedText);
        }).then(success => {
            if (success) {
                vscode.window.showInformationMessage('Comments improved successfully!');
            } else {
                vscode.window.showErrorMessage('Failed to improve comments.');
            }
        });
    });

    context.subscriptions.push(removeCommentsDisposable);
    context.subscriptions.push(improveCommentsDisposable);
}

export function deactivate() {}