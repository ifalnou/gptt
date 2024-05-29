#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import ignore, { Ignore } from 'ignore';

interface Config {
    out?: string;
    in?: string[];
    optional?: string[];
    exclude?: string[];
}

const program = new Command();
const configFileName = '.gpt.json';

program
    .name('gptt')
    .description('CLI tool for generating GPT prompts for coding projects')
    .option('--out <file>', 'Output file for the generated prompt')
    .option('--in <files>', 'Input source code files', (value) => value.split(','))
    .option('--optional <files>', 'Optional source files', (value) => value.split(','), ['./**'])
    .option('--exclude <files>', 'Exclude source files', (value) => value.split(','))
    .parse(process.argv);

const options = program.opts();

const readConfig = async (): Promise<Config> => {
    const cwd = process.cwd();
    const configPath = path.join(cwd, configFileName);
    if (await fs.pathExists(configPath)) {
        return await fs.readJson(configPath);
    }
    return {};
};

const readGitignore = async (): Promise<Ignore> => {
    const cwd = process.cwd();
    const gitignorePath = path.join(cwd, '.gitignore');
    const ig = ignore();
    if (await fs.pathExists(gitignorePath)) {
        const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
        ig.add(gitignoreContent);
    }
    return ig;
};

const readFiles = (patterns: string[], excludePatterns: string[], ig: Ignore): string[] => {
    let files: string[] = [];
    patterns.forEach(pattern => {
        files = files.concat(glob.sync(pattern, { nodir: true }));
    });

    // Apply exclude patterns
    excludePatterns.forEach(pattern => {
        const excludeFiles = glob.sync(pattern, { nodir: true });
        files = files.filter(file => !excludeFiles.includes(file));
    });

    return ig.filter(files);
};

const addFileContent = async (filePath: string): Promise<string> => {
    if (await fs.pathExists(filePath)) {
        const content = await fs.readFile(filePath, 'utf-8');
        const ext = path.extname(filePath);
        const fileMarker = `\n[End of ${filePath}]\n`;
        if (ext === '.md') {
            return `\n\n### File: ${filePath}\n\n${content.trim()}\n\n${fileMarker}`;
        } else {
            return `\n\n### File: ${filePath}\n\`\`\`\n${content.trim()}\n\`\`\`\n\n${fileMarker}`;
        }
    }
    return '';
};

const generatePrompt = async (userPrompt: string, inputFiles: string[], optionalFiles: string[]): Promise<string> => {
    let prompt = `## User Request:\n${userPrompt}\n\n---\n`;

    for (const file of inputFiles) {
        prompt += await addFileContent(file);
    }

    for (const file of optionalFiles) {
        const filename = path.basename(file);
        if (prompt.includes(filename)) {
            prompt += await addFileContent(file);
        }
    }

    prompt += `\n\n---\n## Instructions:\n${userPrompt}`;

    return prompt;
};

const main = async () => {
    try {
        const config = await readConfig();
        const ig = await readGitignore();

        const finalConfig: Config = {
            out: options.out || config.out,
            in: [...(config.in || []), ...(options.in || [])],
            optional: config.optional || options.optional || [],
            exclude: [...(config.exclude || []), ...(options.exclude || [])]
        };

        const inputFiles = readFiles(finalConfig.in!, finalConfig.exclude!, ig);
        const optionalFiles = readFiles(finalConfig.optional!, finalConfig.exclude!, ig);
        const userPrompt = program.args.join(' ');

        const finalPrompt = await generatePrompt(userPrompt, inputFiles, optionalFiles);

        if (finalConfig.out) {
            await fs.writeFile(finalConfig.out, finalPrompt);
            console.log(`Prompt written to ${finalConfig.out}`);
        } else {
            console.log(finalPrompt);
        }
    } catch (error) {
        console.error('Error:', error);
    }
};

main();
