/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import * as ng from '../index';
import {getAngularPackagesFromRunfiles, resolveNpmTreeArtifact} from './runfile_helpers';

// TEST_TMPDIR is always set by Bazel.
const tmpdir = process.env.TEST_TMPDIR !;

export function makeTempDir(): string {
  let dir: string;
  while (true) {
    const id = (Math.random() * 1000000).toFixed(0);
    dir = path.join(tmpdir, `tmp.${id}`);
    if (!fs.existsSync(dir)) break;
  }
  fs.mkdirSync(dir);
  return dir;
}

export interface TestSupport {
  basePath: string;
  write(fileName: string, content: string): void;
  writeFiles(...mockDirs: {[fileName: string]: string}[]): void;
  createCompilerOptions(overrideOptions?: ng.CompilerOptions): ng.CompilerOptions;
  shouldExist(fileName: string): void;
  shouldNotExist(fileName: string): void;
}

function createTestSupportFor(basePath: string) {
  // Typescript uses identity comparison on `paths` and other arrays in order to determine
  // if program structure can be reused for incremental compilation, so we reuse the default
  // values unless overriden, and freeze them so that they can't be accidentaly changed somewhere
  // in tests.
  const defaultCompilerOptions = {
    basePath,
    'experimentalDecorators': true,
    'skipLibCheck': true,
    'strict': true,
    'strictPropertyInitialization': false,
    'types': Object.freeze<string>([]) as string[],
    'outDir': path.resolve(basePath, 'built'),
    'rootDir': basePath,
    'baseUrl': basePath,
    'declaration': true,
    'target': ts.ScriptTarget.ES5,
    'newLine': ts.NewLineKind.LineFeed,
    'module': ts.ModuleKind.ES2015,
    'moduleResolution': ts.ModuleResolutionKind.NodeJs,
    'lib': Object.freeze([
      path.resolve(basePath, 'node_modules/typescript/lib/lib.es6.d.ts'),
    ]) as string[],
    // clang-format off
    'paths': Object.freeze({'@angular/*': ['./node_modules/@angular/*']}) as {[index: string]: string[]}
    // clang-format on
  };


  return {
    // We normalize the basePath into a posix path, so that multiple assertions which compare
    // paths don't need to normalize the path separators each time.
    basePath: normalizeSeparators(basePath),
    write,
    writeFiles,
    createCompilerOptions,
    shouldExist,
    shouldNotExist
  };

  function write(fileName: string, content: string) {
    const dir = path.dirname(fileName);
    if (dir != '.') {
      const newDir = path.resolve(basePath, dir);
      if (!fs.existsSync(newDir)) fs.mkdirSync(newDir);
    }
    fs.writeFileSync(path.resolve(basePath, fileName), content, {encoding: 'utf-8'});
  }

  function writeFiles(...mockDirs: {[fileName: string]: string}[]) {
    mockDirs.forEach(
        (dir) => { Object.keys(dir).forEach((fileName) => { write(fileName, dir[fileName]); }); });
  }

  function createCompilerOptions(overrideOptions: ng.CompilerOptions = {}): ng.CompilerOptions {
    return {...defaultCompilerOptions, ...overrideOptions};
  }

  function shouldExist(fileName: string) {
    if (!fs.existsSync(path.resolve(basePath, fileName))) {
      throw new Error(`Expected ${fileName} to be emitted (basePath: ${basePath})`);
    }
  }

  function shouldNotExist(fileName: string) {
    if (fs.existsSync(path.resolve(basePath, fileName))) {
      throw new Error(`Did not expect ${fileName} to be emitted (basePath: ${basePath})`);
    }
  }
}

export function setupBazelTo(tmpDirPath: string) {
  const nodeModulesPath = path.join(tmpDirPath, 'node_modules');
  const angularDirectory = path.join(nodeModulesPath, '@angular');

  fs.mkdirSync(nodeModulesPath);
  fs.mkdirSync(angularDirectory);

  getAngularPackagesFromRunfiles().forEach(
      ({pkgPath, name}) => { fs.symlinkSync(pkgPath, path.join(angularDirectory, name), 'dir'); });

  // Link typescript
  const typeScriptSource = resolveNpmTreeArtifact('npm/node_modules/typescript');
  const typescriptDest = path.join(nodeModulesPath, 'typescript');
  fs.symlinkSync(typeScriptSource, typescriptDest, 'dir');

  // Link "rxjs" if it has been set up as a runfile. "rxjs" is linked optionally because
  // not all compiler-cli tests need "rxjs" set up.
  try {
    const rxjsSource = resolveNpmTreeArtifact('rxjs', 'index.js');
    const rxjsDest = path.join(nodeModulesPath, 'rxjs');
    fs.symlinkSync(rxjsSource, rxjsDest, 'dir');
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') throw e;
  }
}

export function setup(): TestSupport {
  const tmpDirPath = makeTempDir();
  setupBazelTo(tmpDirPath);
  return createTestSupportFor(tmpDirPath);
}

export function expectNoDiagnostics(options: ng.CompilerOptions, diags: ng.Diagnostics) {
  const errorDiags = diags.filter(d => d.category !== ts.DiagnosticCategory.Message);
  if (errorDiags.length) {
    throw new Error(`Expected no diagnostics: ${ng.formatDiagnostics(errorDiags)}`);
  }
}

export function expectNoDiagnosticsInProgram(options: ng.CompilerOptions, p: ng.Program) {
  expectNoDiagnostics(options, [
    ...p.getNgStructuralDiagnostics(), ...p.getTsSemanticDiagnostics(),
    ...p.getNgSemanticDiagnostics()
  ]);
}

export function normalizeSeparators(path: string): string {
  return path.replace(/\\/g, '/');
}
