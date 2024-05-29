# GPT Prompt Tool (GPTT) 🚀

Welcome to **gptt**, a CLI tool that helps you generate GPT-based prompts directly from your source code files. Whether you need help with code reviews, documentation, or other coding tasks, gptt has you covered.

### Why GPTT? 🤔

- **CLI Integration**: Install globally via npm for easy use.
- **Custom Output**: Use the `--out` option to save prompts to a file.
- **Flexible Inputs**: Specify multiple source files with the `--in` option, including support for glob patterns like `src/**/*.ts`.
- **Smart Optional Files**: Include additional files only if referenced in the prompt using the `--optional` option.
- **JSON Configuration**: Automatically read and merge defaults from a `.gpt.json` file.
- **Respect .gitignore**: Automatically exclude files listed in `.gitignore` from glob patterns.

### How to Use 🛠️

1. **Install the Tool**:
    ```sh
    npm install -g gptt
    ```

2. **Generate Prompts**:
    - **Basic Usage**:
      ```sh
      gptt "Add an open/close menu button in dashboard.ts, and a test in dashboard.test.ts"
      ```
      ```sh
      gptt --in src/file1.ts,src/file2.ts --out prompt.txt "Document these files"
      ```
    - **With Optional Files**:
      ```sh
      gptt --in src/**/*.ts --optional lib/optionalFile.ts "Analyze the code in src and consider lib/optionalFile.ts if necessary"
      ```
    - **Excluding Specific Files**:
      ```sh
      gptt --in src/**/*.ts --exclude src/fileToExclude.ts "Review the codebase"
      ```
    - **Using .gpt.json**:
      ```json
      // .gpt.json
      {
        "in": ["src/main.ts"],
        "optional": ["src/helpers.ts"],
        "exclude": ["src/fileToExclude.ts"],
        "out": "prompt.txt"
      }
      ```

### Features 🌟

- **Boost Productivity**: Automate prompt generation to save time.
- **Developer Friendly**: Easy integration and customization.
- **Versatile Configurations**: Combine CLI options and JSON configurations.

### Contribution 💬

Contributions are welcome! Feel free to open issues, submit PRs, and help improve the tool.

### License 📄

Licensed under the MIT License. See the LICENSE file for more details.

---

**GPTT**: Bringing AI to your coding tasks! 🚀✨

---

### Keywords

`chatgpt`, `cli`, `command-line`, `prompt-generation`, `code-prompt`, `developer-tools`, `code-assistant`, `gpt`, `openai`, `automation`, `programming`, `code-analysis`, `ai-tools`, `script`, `json-config`.

Feel free to adjust the tone and content to better suit your style and audience. Happy coding! 🧑‍💻✨