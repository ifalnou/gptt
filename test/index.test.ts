import { expect } from 'chai';
import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import tmp from 'tmp';

const gpttPath = path.resolve(process.cwd(), "dist/index.js");

const runCli = (args: string, cwd: string): Promise<{ stdout: string; stderr: string }> => {
    return new Promise((resolve, reject) => {
        exec(`node "${gpttPath}" ${args}`, { cwd }, (error, stdout, stderr) => {
            if (error) {
                reject({ stdout, stderr });
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
};

describe('gptt CLI', () => {
    let tmpDir: tmp.DirResult;

    beforeEach(async () => {
        tmpDir = tmp.dirSync({ unsafeCleanup: true });
        await fs.mkdir(path.join(tmpDir.name, 'src'), { recursive: true });
        await fs.writeFile(path.join(tmpDir.name, 'src/file1.ts'), 'const foo = "bar";');
        await fs.writeFile(path.join(tmpDir.name, 'src/file2.ts'), 'const bar = "baz";');
        await fs.writeFile(path.join(tmpDir.name, 'src/file3.ts'), 'const john = "doo";');
        await fs.writeFile(path.join(tmpDir.name, '.gitignore'), 'node_modules\n/dist');

        // Create dist directory and index.js file
        await fs.mkdir(path.join(tmpDir.name, 'dist'), { recursive: true });
        await fs.writeFile(path.join(tmpDir.name, 'dist/index.js'), '');
    });

    afterEach(() => {
        tmpDir.removeCallback();
    });

    it('should generate a prompt with input and optional files when .gpt.json is present', async () => {
        await fs.writeJson(path.join(tmpDir.name, '.gpt.json'), { in: ['src/file1.ts'], optional: ['src/file2.ts'], out: 'output.txt' });
        await runCli('file2.ts', tmpDir.name);
        const outputPath = path.join(tmpDir.name, 'output.txt');
        const outputContent = await fs.readFile(outputPath, 'utf-8');
        expect(outputContent).to.include('const foo = "bar";');
        expect(outputContent).to.include('const bar = "baz";');
    });

    it('should write the output to the specified file using command line params', async () => {
        await runCli('--in src/file1.ts --optional src/file2.ts --out output.txt file2.ts', tmpDir.name);
        const outputPath = path.join(tmpDir.name, 'output.txt');
        const outputContent = await fs.readFile(outputPath, 'utf-8');
        expect(outputContent).to.include('const foo = "bar";');
        expect(outputContent).to.include('const bar = "baz";');
    });

    it('should handle command line options correctly and print to stdout', async () => {
        const { stdout } = await runCli('--in src/file1.ts --optional src/file2.ts file2.ts', tmpDir.name);
        expect(stdout).to.include('const foo = "bar";');
        expect(stdout).to.include('const bar = "baz";');
    });

    it('should filter out files based on .gitignore', async () => {
        await fs.mkdir(path.join(tmpDir.name, 'node_modules/package'), { recursive: true });
        await fs.writeFile(path.join(tmpDir.name, 'node_modules/package/index.js'), 'const pkg = "ignored";');
        await runCli('--in src/** --optional node_modules/** --out output.txt src/file1.ts file2.ts', tmpDir.name);
        const outputPath = path.join(tmpDir.name, 'output.txt');
        const outputContent = await fs.readFile(outputPath, 'utf-8');
        expect(outputContent).to.include('const foo = "bar";');
        expect(outputContent).to.include('const bar = "baz";');
        expect(outputContent).not.to.include('const pkg = "ignored";');
    });

    it('should handle missing .gpt.json gracefully', async () => {
        const { stdout } = await runCli('--in src/file1.ts --optional src/file2.ts file2.ts', tmpDir.name);
        expect(stdout).to.include('const foo = "bar";');
        expect(stdout).to.include('const bar = "baz";');
    });

    it('should display an error for invalid input files', async () => {
        try {
            await runCli('--in invalid/file.ts', tmpDir.name);
        } catch (error: any) {
            expect(error.stderr).to.include('Error:');
        }
    });

    it('should handle no input files specified gracefully', async () => {
        const userRequest = 'This is a user request';
        const { stdout } = await runCli(`"${userRequest}"`, tmpDir.name);
        expect(stdout).to.include(`## User Request:\n${userRequest}\n\n---\n\n\n---\n## Instructions:\n${userRequest}`);
    });

    it('should handle multiple input files correctly', async () => {
        const { stdout } = await runCli('--in src/file1.ts,src/file3.ts', tmpDir.name);
        expect(stdout).to.include('const foo = "bar";');
        expect(stdout).to.include('const john = "doo";');
    });

    it('should handle multiple optional files and include referenced ones', async () => {
        await runCli('--in src/file1.ts --optional src/file2.ts,src/file3.ts --out output.txt file3.ts', tmpDir.name);
        const outputPath = path.join(tmpDir.name, 'output.txt');
        const outputContent = await fs.readFile(outputPath, 'utf-8');
        expect(outputContent).to.include('const foo = "bar";');
        expect(outputContent).not.to.include('const bar = "baz";');
        expect(outputContent).to.include('const john = "doo";');
    });

    it('should handle globs in the input files', async () => {
        const { stdout } = await runCli('--in src/*.ts --optional src/file3.ts file3.ts', tmpDir.name);
        expect(stdout).to.include('const foo = "bar";');
        expect(stdout).to.include('const bar = "baz";');
        expect(stdout).to.include('const john = "doo";');
    });

    it('should merge command line options and .gpt.json configuration', async () => {
        await fs.writeJson(path.join(tmpDir.name, '.gpt.json'), { in: ['src/file1.ts'], optional: ['src/file2.ts'] });
        await runCli('--in src/file3.ts --out output.txt file2.ts', tmpDir.name);
        const outputPath = path.join(tmpDir.name, 'output.txt');
        const outputContent = await fs.readFile(outputPath, 'utf-8');
        expect(outputContent).to.include('const foo = "bar";');
        expect(outputContent).to.include('const john = "doo";');
        expect(outputContent).to.include('const bar = "baz";');
    });

    it('should exclude specified files using the --exclude option', async () => {
        const { stdout } = await runCli('--in src/*.ts --optional src/file3.ts --exclude src/file2.ts', tmpDir.name);
        expect(stdout).to.include('const foo = "bar";');
        expect(stdout).not.to.include('const bar = "baz";');
        expect(stdout).to.include('const john = "doo";');
    });
});
