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

const readFiles = async (patterns: string[], excludePatterns: string[], ig: Ignore): Promise<string[]> => {
    let files: string[] = [];
    const globPromises = patterns.map(pattern => glob(pattern, { nodir: true }));

    const resolvedFiles = await Promise.all(globPromises);
    files = resolvedFiles.flat();

    // Apply exclude patterns
    const excludePromises = excludePatterns.map(pattern => glob(pattern, { nodir: true }));

    const excludeFiles = (await Promise.all(excludePromises)).flat();
    files = files.filter(file => !excludeFiles.includes(file));

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

const generatePrompt = async (userPrompt: string, inputFiles: Set<string>, optionalFiles: Set<string>): Promise<{prompt: string, files: string[]}> => {
    let prompt = `## User Request:\n${userPrompt}\n\n---\n`;

    const filePromises = [...inputFiles].map(addFileContent);
    const inputFileContents = await Promise.all(filePromises);

    prompt += inputFileContents.join('');

    const files = [...inputFiles];

    for (const file of optionalFiles) {
        const filename = path.basename(file);
        if (userPrompt.includes(filename) && !inputFiles.has(file)) {
            prompt += await addFileContent(file);
            files.push(file);
        }
    }

    prompt += `\n\n---\n## Instructions:\n${userPrompt}`;

    return {prompt, files: [...new Set(files)]};
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

        const inputFiles = new Set(await readFiles(finalConfig.in!, finalConfig.exclude!, ig));
        const optionalFiles = new Set(await readFiles(finalConfig.optional!, finalConfig.exclude!, ig));

        const userPrompt = program.args.join(' ');

        const {prompt: finalPrompt, files} = await generatePrompt(userPrompt, inputFiles, optionalFiles);

        if (finalConfig.out) {
            await fs.writeFile(finalConfig.out, finalPrompt);
            console.log("Included files:", files);
            console.log("With user prompt:", userPrompt);
            console.log(`Prompt written to ${finalConfig.out}`);
        } else {
            console.log(finalPrompt);
        }
    } catch (error) {
        console.error('Error:', error);
    }
};

main();
