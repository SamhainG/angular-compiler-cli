/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {MockDirectory, setup} from '@angular/compiler/test/aot/test_util';
import {compile, expectEmit} from './mock_compile';

describe('r3_view_compiler', () => {
  const angularFiles = setup({
    compileAngular: false,
    compileFakeCore: true,
    compileAnimations: false,
  });

  describe('hello world', () => {
    it('should be able to generate the hello world component', () => {
      const files: MockDirectory = {
        app: {
          'hello.ts': `
           import {Component, NgModule} from '@angular/core';

           @Component({
             selector: 'hello-world',
             template: 'Hello, world!'
           })
           export class HelloWorldComponent {

           }

           @NgModule({
             declarations: [HelloWorldComponent]
           })
           export class HelloWorldModule {}
        `
        }
      };
      compile(files, angularFiles);
    });
  });

  it('should be able to generate the example', () => {
    const files: MockDirectory = {
      app: {
        'example.ts': `
        import {Component, OnInit, OnDestroy, ElementRef, Input, NgModule} from '@angular/core';

        @Component({
          selector: 'my-app',
          template: '<todo [data]="list"></todo>'
        })
        export class MyApp implements OnInit {

          list: any[] = [];

          constructor(public elementRef: ElementRef) {}

          ngOnInit(): void {
          }
        }

        @Component({
          selector: 'todo',
          template: '<ul class="list" [title]="myTitle"><li *ngFor="let item of data">{{data}}</li></ul>'
        })
        export class TodoComponent implements OnInit, OnDestroy {

          @Input()
          data: any[] = [];

          myTitle: string;

          constructor(public elementRef: ElementRef) {}

          ngOnInit(): void {}

          ngOnDestroy(): void {}
        }

        @NgModule({
          declarations: [TodoComponent, MyApp],
        })
        export class TodoModule{}
        `
      }
    };
    const result = compile(files, angularFiles);
    expect(result.source).toContain('@angular/core');
  });

  describe('interpolations', () => {
    // Regression #21927
    it('should generate a correct call to bV with more than 8 interpolations', () => {
      const files: MockDirectory = {
        app: {
          'example.ts': `
          import {Component, NgModule} from '@angular/core';

          @Component({
            selector: 'my-app',
            template: ' {{list[0]}} {{list[1]}} {{list[2]}} {{list[3]}} {{list[4]}} {{list[5]}} {{list[6]}} {{list[7]}} {{list[8]}} '
          })
          export class MyApp {
            list: any[] = [];
          }

          @NgModule({declarations: [MyApp]})
          export class MyModule {}`
        }
      };

      const bV_call =
          `$r3$.??interpolationV([" ",ctx.list[0]," ",ctx.list[1]," ",ctx.list[2]," ",ctx.list[3],
        " ",ctx.list[4]," ",ctx.list[5]," ",ctx.list[6]," ",ctx.list[7]," ",ctx.list[8],
        " "])`;
      const result = compile(files, angularFiles);
      expectEmit(result.source, bV_call, 'Incorrect bV call');
    });
  });

  describe('animations', () => {
    it('should keep @attr but suppress [@attr]', () => {
      const files: MockDirectory = {
        app: {
          'example.ts': `
          import {Component, NgModule} from '@angular/core';

          @Component({
            selector: 'my-app',
            template: '<div @attrOnly [@myAnimation]="exp"></div>'
          })
          export class MyApp {
          }

          @NgModule({declarations: [MyApp]})
          export class MyModule {}`
        }
      };

      const template = `
      const _c0 = ["@attrOnly", ""];
      // ...
      template: function MyApp_Template(rf, ctx) {
        if (rf & 1) {
          $i0$.??element(0, "div", _c0);
          // ...
        }
        // ...
      }`;
      const result = compile(files, angularFiles);
      expectEmit(result.source, template, 'Incorrect initialization attributes');
    });

    it('should dedup multiple [@event] listeners', () => {
      const files: MockDirectory = {
        app: {
          'example.ts': `
          import {Component, NgModule} from '@angular/core';

          @Component({
            selector: 'my-app',
            template: '<div (@mySelector.start)="false" (@mySelector.done)="false" [@mySelector]="0"></div>'
          })
          export class MyApp {
          }

          @NgModule({declarations: [MyApp]})
          export class MyModule {}`
        }
      };

      const template = `
      const _c0 = [3, "@mySelector"];
      // ...
      template: function MyApp_Template(rf, ctx) {
        if (rf & 1) {
          $i0$.??elementStart(0, "div", _c0);
          // ...
        }
        // ...
      }`;
      const result = compile(files, angularFiles);
      expectEmit(result.source, template, 'Incorrect initialization attributes');
    });
  });
});
