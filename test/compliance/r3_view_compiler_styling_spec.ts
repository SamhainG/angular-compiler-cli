/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {AttributeMarker, ViewEncapsulation} from '@angular/compiler/src/core';
import {setup} from '@angular/compiler/test/aot/test_util';
import {compile, expectEmit} from './mock_compile';

describe('compiler compliance: styling', () => {
  const angularFiles = setup({
    compileAngular: false,
    compileFakeCore: true,
    compileAnimations: false,
  });

  describe('@Component.styles', () => {
    it('should pass in the component metadata styles into the component definition and shim them using style encapsulation',
       () => {
         const files = {
           app: {
             'spec.ts': `
                import {Component, NgModule} from '@angular/core';

                @Component({
                  selector: "my-component",
                  styles: ["div.foo { color: red; }", ":host p:nth-child(even) { --webkit-transition: 1s linear all; }"],
                  template: "..."
                })
                export class MyComponent {
                }

                @NgModule({declarations: [MyComponent]})
                export class MyModule {}
            `
           }
         };

         const template =
             'styles: ["div.foo[_ngcontent-%COMP%] { color: red; }", "[_nghost-%COMP%]   p[_ngcontent-%COMP%]:nth-child(even) { --webkit-transition: 1s linear all; }"]';
         const result = compile(files, angularFiles);
         expectEmit(result.source, template, 'Incorrect template');
       });

    it('should pass in styles, but skip shimming the styles if the view encapsulation signals not to',
       () => {
         const files = {
           app: {
             'spec.ts': `
                import {Component, NgModule} from '@angular/core';

                @Component({
                  selector: "my-component",
                  encapsulation: ${ViewEncapsulation.None},
                  styles: ["div.tall { height: 123px; }", ":host.small p { height:5px; }"],
                  template: "..."
                })
                export class MyComponent {
                }

                @NgModule({declarations: [MyComponent]})
                export class MyModule {}
            `
           }
         };

         const template = 'div.tall { height: 123px; }", ":host.small p { height:5px; }';
         const result = compile(files, angularFiles);
         expectEmit(result.source, template, 'Incorrect template');
       });

    it('should pass in the component metadata styles into the component definition but skip shimming when style encapsulation is set to native',
       () => {
         const files = {
           app: {
             'spec.ts': `
                import {Component, NgModule} from '@angular/core';

                @Component({
                  encapsulation: ${ViewEncapsulation.Native},
                  selector: "my-component",
                  styles: ["div.cool { color: blue; }", ":host.nice p { color: gold; }"],
                  template: "..."
                })
                export class MyComponent {
                }

                @NgModule({declarations: [MyComponent]})
                export class MyModule {}
            `
           }
         };

         const template = `
         MyComponent.ngComponentDef = $r3$.??defineComponent({
           ???
           styles: ["div.cool { color: blue; }", ":host.nice p { color: gold; }"],
           encapsulation: 1
         })
         `;
         const result = compile(files, angularFiles);
         expectEmit(result.source, template, 'Incorrect template');
       });
  });

  describe('@Component.animations', () => {
    it('should pass in the component metadata animations into the component definition', () => {
      const files = {
        app: {
          'spec.ts': `
                import {Component, NgModule} from '@angular/core';

                @Component({
                  selector: "my-component",
                  animations: [{name: 'foo123'}, {name: 'trigger123'}],
                  template: ""
                })
                export class MyComponent {
                }

                @NgModule({declarations: [MyComponent]})
                export class MyModule {}
            `
        }
      };

      const template = `
        MyComponent.ngComponentDef = $r3$.??defineComponent({
          type: MyComponent,
          selectors:[["my-component"]],
          factory:function MyComponent_Factory(t){
            return new (t || MyComponent)();
          },
          consts: 0,
          vars: 0,
          template:  function MyComponent_Template(rf, $ctx$) {
          },
          encapsulation: 2,
          data: {
            animation: [{name: 'foo123'}, {name: 'trigger123'}]
          }
        });
      `;

      const result = compile(files, angularFiles);
      expectEmit(result.source, template, 'Incorrect template');
    });

    it('should include animations even if the provided array is empty', () => {
      const files = {
        app: {
          'spec.ts': `
                import {Component, NgModule} from '@angular/core';

                @Component({
                  selector: "my-component",
                  animations: [],
                  template: ""
                })
                export class MyComponent {
                }

                @NgModule({declarations: [MyComponent]})
                export class MyModule {}
            `
        }
      };

      const template = `
        MyComponent.ngComponentDef = $r3$.??defineComponent({
          type: MyComponent,
          selectors:[["my-component"]],
          factory:function MyComponent_Factory(t){
            return new (t || MyComponent)();
          },
          consts: 0,
          vars: 0,
          template:  function MyComponent_Template(rf, $ctx$) {
          },
          encapsulation: 2,
          data: {
            animation: []
          }
        });
      `;

      const result = compile(files, angularFiles);
      expectEmit(result.source, template, 'Incorrect template');
    });

    it('should generate any animation triggers into the component template', () => {
      const files = {
        app: {
          'spec.ts': `
                import {Component, NgModule} from '@angular/core';

                @Component({
                  selector: "my-component",
                  template: \`
                    <div [@foo]='exp'></div>
                    <div @bar></div>
                    <div [@baz]></div>\`,
                })
                export class MyComponent {
                }

                @NgModule({declarations: [MyComponent]})
                export class MyModule {}
            `
        }
      };

      const template = `
        const $e1_attrs$ = ["@bar", ""];
        const $e2_attrs$ = ["@baz", ""];
        ???
        MyComponent.ngComponentDef = $r3$.??defineComponent({
          ???
          consts: 3,
          vars: 1,
          template:  function MyComponent_Template(rf, $ctx$) {
            if (rf & 1) {
              $r3$.??element(0, "div");
              $r3$.??element(1, "div", $e1_attrs$);
              $r3$.??element(2, "div", $e2_attrs$);
            }
            if (rf & 2) {
              $r3$.??elementProperty(0, "@foo", $r3$.??bind(ctx.exp));
            }
          },
          encapsulation: 2
        });
      `;

      const result = compile(files, angularFiles);
      expectEmit(result.source, template, 'Incorrect template');
    });

    it('should generate animation listeners', () => {
      const files = {
        app: {
          'spec.ts': `
            import {Component, NgModule} from '@angular/core';

            @Component({
              selector: 'my-cmp',
              template: \`
                <div [@myAnimation]="exp"
                  (@myAnimation.start)="onStart($event)"
                  (@myAnimation.done)="onDone($event)"></div>
              \`,
              animations: [trigger(
                   'myAnimation',
                   [transition(
                       '* => state',
                       [style({'opacity': '0'}), animate(500, style({'opacity': '1'}))])])],
            })
            class MyComponent {
              exp: any;
              startEvent: any;
              doneEvent: any;
              onStart(event: any) { this.startEvent = event; }
              onDone(event: any) { this.doneEvent = event; }
            }

            @NgModule({declarations: [MyComponent]})
            export class MyModule {}
          `
        }
      };

      const template = `
        ???
        MyComponent.ngComponentDef = $r3$.??defineComponent({
          ???
          consts: 1,
          vars: 1,
          template: function MyComponent_Template(rf, ctx) {
            if (rf & 1) {
              $r3$.??elementStart(0, "div", _c0);
              $r3$.??listener("@myAnimation.start", function MyComponent_Template_div_animation_myAnimation_start_0_listener($event) { return ctx.onStart($event); });
              $r3$.??listener("@myAnimation.done", function MyComponent_Template_div_animation_myAnimation_done_0_listener($event) { return ctx.onDone($event); });
              $r3$.??elementEnd();
            } if (rf & 2) {
              $r3$.??elementProperty(0, "@myAnimation", $r3$.??bind(ctx.exp));
            }
          },
          encapsulation: 2,
          ???
        });
      `;

      const result = compile(files, angularFiles);
      expectEmit(result.source, template, 'Incorrect template');
    });

    it('should generate animation host binding and listener code for directives', () => {
      const files = {
        app: {
          'spec.ts': `
            import {Directive, Component, NgModule} from '@angular/core';

            @Directive({
              selector: '[my-anim-dir]',
              animations: [
                {name: 'myAnim'}
              ],
              host: {
                '[@myAnim]': 'myAnimState',
                '(@myAnim.start)': 'onStart()',
                '(@myAnim.done)': 'onDone()'
              }
            })
            class MyAnimDir {
              onStart() {}
              onDone() {}
              myAnimState = '123';
            }

            @Component({
              selector: 'my-cmp',
              template: \`
                <div my-anim-dir></div>
              \`
            })
            class MyComponent {
            }

            @NgModule({declarations: [MyComponent, MyAnimDir]})
            export class MyModule {}
          `
        }
      };

      const template = `
        MyAnimDir.ngDirectiveDef = $r3$.??defineDirective({
          ???
          hostBindings: function MyAnimDir_HostBindings(rf, ctx, elIndex) {
            if (rf & 1) {
              $r3$.??allocHostVars(1);
              $r3$.??listener("@myAnim.start", function MyAnimDir_animation_myAnim_start_HostBindingHandler($event) { return ctx.onStart(); });
              $r3$.??listener("@myAnim.done", function MyAnimDir_animation_myAnim_done_HostBindingHandler($event) { return ctx.onDone(); });
            } if (rf & 2) {
              $r3$.??componentHostSyntheticProperty(elIndex, "@myAnim", $r3$.??bind(ctx.myAnimState), null, true);
            }
          }
          ???
        });
      `;

      const result = compile(files, angularFiles);
      expectEmit(result.source, template, 'Incorrect template');
    });
  });

  describe('[style] and [style.prop]', () => {
    it('should create style instructions on the element', () => {
      const files = {
        app: {
          'spec.ts': `
                import {Component, NgModule} from '@angular/core';

                @Component({
                  selector: 'my-component',
                  template: \`<div [style]="myStyleExp"></div>\`
                })
                export class MyComponent {
                  myStyleExp = [{color:'red'}, {color:'blue', duration:1000}]
                }

                @NgModule({declarations: [MyComponent]})
                export class MyModule {}
            `
        }
      };

      const template = `
          template: function MyComponent_Template(rf, $ctx$) {
            if (rf & 1) {
              $r3$.??elementStart(0, "div");
              $r3$.??elementStyling(null, null, $r3$.??defaultStyleSanitizer);
              $r3$.??elementEnd();
            }
            if (rf & 2) {
              $r3$.??elementStylingMap(0, null, $ctx$.myStyleExp);
              $r3$.??elementStylingApply(0);
            }
          }
          `;

      const result = compile(files, angularFiles);
      expectEmit(result.source, template, 'Incorrect template');
    });

    it('should place initial, multi, singular and application followed by attribute style instructions in the template code in that order',
       () => {
         const files = {
           app: {
             'spec.ts': `
                import {Component, NgModule} from '@angular/core';

                @Component({
                  selector: 'my-component',
                  template: \`<div style="opacity:1"
                                   [attr.style]="'border-width: 10px'"
                                   [style.width]="myWidth"
                                   [style]="myStyleExp"
                                   [style.height]="myHeight"></div>\`
                })
                export class MyComponent {
                  myStyleExp = [{color:'red'}, {color:'blue', duration:1000}]
                  myWidth = '100px';
                  myHeight = '100px';
                }

                @NgModule({declarations: [MyComponent]})
                export class MyModule {}
            `
           }
         };

         const template = `
          const $_c0$ = [${AttributeMarker.Styles}, "opacity", "1", ${AttributeMarker.SelectOnly}, "style"];
          const $_c1$ = ["width", "height"];
          ???
          MyComponent.ngComponentDef = $r3$.??defineComponent({
              type: MyComponent,
              selectors:[["my-component"]],
              factory:function MyComponent_Factory(t){
                return new (t || MyComponent)();
              },
              consts: 1,
              vars: 1,
              template:  function MyComponent_Template(rf, $ctx$) {
                if (rf & 1) {
                  $r3$.??elementStart(0, "div", $_c0$);
                  $r3$.??elementStyling(null, $_c1$, $r3$.??defaultStyleSanitizer);
                  $r3$.??elementEnd();
                }
                if (rf & 2) {
                  $r3$.??elementStylingMap(0, null, $ctx$.myStyleExp);
                  $r3$.??elementStyleProp(0, 0, $ctx$.myWidth);
                  $r3$.??elementStyleProp(0, 1, $ctx$.myHeight);
                  $r3$.??elementStylingApply(0);
                  $r3$.??elementAttribute(0, "style", $r3$.??bind("border-width: 10px"), $r3$.??sanitizeStyle);
                }
              },
              encapsulation: 2
            });
        `;

         const result = compile(files, angularFiles);
         expectEmit(result.source, template, 'Incorrect template');
       });

    it('should assign a sanitizer instance to the element style allocation instruction if any url-based properties are detected',
       () => {
         const files = {
           app: {
             'spec.ts': `
                import {Component, NgModule} from '@angular/core';

                @Component({
                  selector: 'my-component',
                  template: \`<div [style.background-image]="myImage">\`
                })
                export class MyComponent {
                  myImage = 'url(foo.jpg)';
                }

                @NgModule({declarations: [MyComponent]})
                export class MyModule {}
            `
           }
         };

         const template = `
          const $_c0$ = ["background-image"];
          export class MyComponent {
              constructor() {
                  this.myImage = 'url(foo.jpg)';
              }
          }

          MyComponent.ngComponentDef = $r3$.??defineComponent({
            type: MyComponent,
            selectors: [["my-component"]],
            factory: function MyComponent_Factory(t) {
              return new (t || MyComponent)();
            },
            consts: 1,
            vars: 0,
            template:  function MyComponent_Template(rf, ctx) {
              if (rf & 1) {
                $r3$.??elementStart(0, "div");
                $r3$.??elementStyling(null, _c0, $r3$.??defaultStyleSanitizer);
                $r3$.??elementEnd();
              }
              if (rf & 2) {
                $r3$.??elementStyleProp(0, 0, ctx.myImage);
                $r3$.??elementStylingApply(0);
              }
            },
            encapsulation: 2
          });
        `;

         const result = compile(files, angularFiles);
         expectEmit(result.source, template, 'Incorrect template');
       });

    it('should support [style.foo.suffix] style bindings with a suffix', () => {
      const files = {
        app: {
          'spec.ts': `
             import {Component, NgModule} from '@angular/core';

             @Component({
               selector: 'my-component',
               template: \`<div [style.font-size.px]="12">\`
             })
             export class MyComponent {
             }

             @NgModule({declarations: [MyComponent]})
             export class MyModule {}
         `
        }
      };

      const template = `
          const $e0_styles$ = ["font-size"];
          ???
          template:  function MyComponent_Template(rf, ctx) {
            if (rf & 1) {
              $r3$.??elementStart(0, "div");
              $r3$.??elementStyling(null, _c0);
              $r3$.??elementEnd();
            }
            if (rf & 2) {
              $r3$.??elementStyleProp(0, 0, 12, "px");
              $r3$.??elementStylingApply(0);
            }
          }
     `;

      const result = compile(files, angularFiles);
      expectEmit(result.source, template, 'Incorrect template');

    });
  });

  describe('[class]', () => {
    it('should create class styling instructions on the element', () => {
      const files = {
        app: {
          'spec.ts': `
                import {Component, NgModule} from '@angular/core';

                @Component({
                  selector: 'my-component',
                  template: \`<div [class]="myClassExp"></div>\`
                })
                export class MyComponent {
                  myClassExp = {'foo':true}
                }

                @NgModule({declarations: [MyComponent]})
                export class MyModule {}
            `
        }
      };

      const template = `
          template: function MyComponent_Template(rf, $ctx$) {
            if (rf & 1) {
              $r3$.??elementStart(0, "div");
              $r3$.??elementStyling();
              $r3$.??elementEnd();
            }
            if (rf & 2) {
              $r3$.??elementStylingMap(0,$ctx$.myClassExp);
              $r3$.??elementStylingApply(0);
            }
          }
          `;

      const result = compile(files, angularFiles);
      expectEmit(result.source, template, 'Incorrect template');
    });

    it('should place initial, multi, singular and application followed by attribute class instructions in the template code in that order',
       () => {
         const files = {
           app: {
             'spec.ts': `
                import {Component, NgModule} from '@angular/core';

                @Component({
                  selector: 'my-component',
                  template: \`<div class="grape"
                                   [attr.class]="'banana'"
                                   [class.apple]="yesToApple"
                                   [class]="myClassExp"
                                   [class.orange]="yesToOrange"></div>\`
                })
                export class MyComponent {
                  myClassExp = {a:true, b:true};
                  yesToApple = true;
                  yesToOrange = true;
                }

                @NgModule({declarations: [MyComponent]})
                export class MyModule {}
            `
           }
         };

         const template = `
          const $e0_attrs$ = [${AttributeMarker.Classes}, "grape", ${AttributeMarker.SelectOnly}, "class"];
          const $e0_bindings$ = ["apple", "orange"];
          ???
          MyComponent.ngComponentDef = $r3$.??defineComponent({
              type: MyComponent,
              selectors:[["my-component"]],
              factory:function MyComponent_Factory(t){
                return new (t || MyComponent)();
              },
              consts: 1,
              vars: 1,
              template:  function MyComponent_Template(rf, $ctx$) {
                if (rf & 1) {
                  $r3$.??elementStart(0, "div", $e0_attrs$);
                  $r3$.??elementStyling($e0_bindings$);
                  $r3$.??elementEnd();
                }
                if (rf & 2) {
                  $r3$.??elementStylingMap(0, $ctx$.myClassExp);
                  $r3$.??elementClassProp(0, 0, $ctx$.yesToApple);
                  $r3$.??elementClassProp(0, 1, $ctx$.yesToOrange);
                  $r3$.??elementStylingApply(0);
                  $r3$.??elementAttribute(0, "class", $r3$.??bind("banana"));
                }
              },
              encapsulation: 2
            });
        `;

         const result = compile(files, angularFiles);
         expectEmit(result.source, template, 'Incorrect template');
       });

    it('should not generate the styling apply instruction if there are only static style/class attributes',
       () => {
         const files = {
           app: {
             'spec.ts': `
                import {Component, NgModule} from '@angular/core';

                @Component({
                  selector: 'my-component',
                  template: \`<div class="    foo  "
                                   style="width:100px"
                                   [attr.class]="'round'"
                                   [attr.style]="'height:100px'"></div>\`
                })
                export class MyComponent {}

                @NgModule({declarations: [MyComponent]})
                export class MyModule {}
            `
           }
         };

         const template = `
          const $e0_attrs$ = [${AttributeMarker.Classes}, "foo", ${AttributeMarker.Styles}, "width", "100px", ${AttributeMarker.SelectOnly}, "class", "style"];
          ???
          MyComponent.ngComponentDef = $r3$.??defineComponent({
              type: MyComponent,
              selectors:[["my-component"]],
              factory:function MyComponent_Factory(t){
                return new (t || MyComponent)();
              },
              consts: 1,
              vars: 2,
              template:  function MyComponent_Template(rf, $ctx$) {
                if (rf & 1) {
                  $r3$.??elementStart(0, "div", $e0_attrs$);
                  $r3$.??elementEnd();
                }
                if (rf & 2) {
                  $r3$.??elementAttribute(0, "class", $r3$.??bind("round"));
                  $r3$.??elementAttribute(0, "style", $r3$.??bind("height:100px"), $r3$.??sanitizeStyle);
                }
              },
              encapsulation: 2
            });
        `;

         const result = compile(files, angularFiles);
         expectEmit(result.source, template, 'Incorrect template');
       });
  });

  describe('[style] mixed with [class]', () => {
    it('should combine [style] and [class] bindings into a single instruction', () => {
      const files = {
        app: {
          'spec.ts': `
                import {Component, NgModule} from '@angular/core';

                @Component({
                  selector: 'my-component',
                  template: \`<div [style]="myStyleExp" [class]="myClassExp"></div>\`
                })
                export class MyComponent {
                  myStyleExp = [{color:'red'}, {color:'blue', duration:1000}]
                  myClassExp = 'foo bar apple';
                }

                @NgModule({declarations: [MyComponent]})
                export class MyModule {}
            `
        }
      };

      const template = `
          template: function MyComponent_Template(rf, $ctx$) {
            if (rf & 1) {
              $r3$.??elementStart(0, "div");
              $r3$.??elementStyling(null, null, $r3$.??defaultStyleSanitizer);
              $r3$.??elementEnd();
            }
            if (rf & 2) {
              $r3$.??elementStylingMap(0, $ctx$.myClassExp, $ctx$.myStyleExp);
              $r3$.??elementStylingApply(0);
            }
          }
          `;

      const result = compile(files, angularFiles);
      expectEmit(result.source, template, 'Incorrect template');
    });

    it('should stamp out pipe definitions in the creation block if used by styling bindings',
       () => {
         const files = {
           app: {
             'spec.ts': `
                import {Component, NgModule} from '@angular/core';

                @Component({
                  selector: 'my-component',
                  template: \`<div [style]="myStyleExp | stylePipe" [class]="myClassExp | classPipe"></div>\`
                })
                export class MyComponent {
                  myStyleExp = [{color:'red'}, {color:'blue', duration:1000}]
                  myClassExp = 'foo bar apple';
                }

                @NgModule({declarations: [MyComponent]})
                export class MyModule {}
            `
           }
         };

         const template = `
          template: function MyComponent_Template(rf, $ctx$) {
            if (rf & 1) {
              $r3$.??elementStart(0, "div");
              $r3$.??elementStyling(null, null, $r3$.??defaultStyleSanitizer);
              $r3$.??pipe(1, "classPipe");
              $r3$.??pipe(2, "stylePipe");
              $r3$.??elementEnd();
            }
            if (rf & 2) {
              $r3$.??elementStylingMap(0, $r3$.??pipeBind1(1, 0, $ctx$.myClassExp), $r3$.??pipeBind1(2, 2, $ctx$.myStyleExp));
              $r3$.??elementStylingApply(0);
            }
          }
          `;

         const result = compile(files, angularFiles);
         expectEmit(result.source, template, 'Incorrect template');
       });

    it('should properly offset multiple style pipe references for styling bindings', () => {
      const files = {
        app: {
          'spec.ts': `
                import {Component, NgModule} from '@angular/core';

                @Component({
                  selector: 'my-component',
                  template: \`
                    <div [class]="{}"
                         [class.foo]="fooExp | pipe:2000"
                         [style]="myStyleExp | pipe:1000"
                         [style.bar]="barExp | pipe:3000"
                         [style.baz]="bazExp | pipe:4000">
                         {{ item }}</div>\`
                })
                export class MyComponent {
                  myStyleExp = {};
                  fooExp = 'foo';
                  barExp = 'bar';
                  bazExp = 'baz';
                  items = [1,2,3];
                }

                @NgModule({declarations: [MyComponent]})
                export class MyModule {}
            `
        }
      };

      const template = `
          const $e0_classBindings$ = ["foo"];
          const $e0_styleBindings$ = ["bar", "baz"];
          ???
          template: function MyComponent_Template(rf, $ctx$) {
            if (rf & 1) {
              $r3$.??elementStart(0, "div");
              $r3$.??elementStyling($e0_classBindings$, $e0_styleBindings$, $r3$.??defaultStyleSanitizer);
              $r3$.??pipe(1, "pipe");
              $r3$.??pipe(2, "pipe");
              $r3$.??pipe(3, "pipe");
              $r3$.??pipe(4, "pipe");
              $r3$.??text(5);
              $r3$.??elementEnd();
            }
            if (rf & 2) {
              $r3$.??elementStylingMap(0, $e2_styling$, $r3$.??pipeBind2(1, 1, $ctx$.myStyleExp, 1000));
              $r3$.??elementStyleProp(0, 0, $r3$.??pipeBind2(2, 4, $ctx$.barExp, 3000));
              $r3$.??elementStyleProp(0, 1, $r3$.??pipeBind2(3, 7, $ctx$.bazExp, 4000));
              $r3$.??elementClassProp(0, 0, $r3$.??pipeBind2(4, 10, $ctx$.fooExp, 2000));
              $r3$.??elementStylingApply(0);
              $r3$.??textBinding(5, $r3$.??interpolation1(" ", $ctx$.item, ""));
            }
          }
          `;

      const result = compile(files, angularFiles);
      expectEmit(result.source, template, 'Incorrect template');
    });
  });

  describe('@Component host styles/classes', () => {
    it('should generate style/class instructions for a host component creation definition', () => {
      const files = {
        app: {
          'spec.ts': `
                import {Component, NgModule, HostBinding} from '@angular/core';

                @Component({
                  selector: 'my-component',
                  template: '',
                  host: {
                    'style': 'width:200px; height:500px',
                    'class': 'foo baz'
                  }
                })
                export class MyComponent {
                  @HostBinding('style')
                  myStyle = {width:'100px'};

                  @HostBinding('class')
                  myClass = {bar:false};

                  @HostBinding('style.color')
                  myColorProp = 'red';

                  @HostBinding('class.foo')
                  myFooClass = 'red';
                }

                @NgModule({declarations: [MyComponent]})
                export class MyModule {}
            `
        }
      };

      const template = `
          const $e0_attrs$ = [${AttributeMarker.Classes}, "foo", "baz", ${AttributeMarker.Styles}, "width", "200px", "height", "500px"];
          const $e0_classBindings$ = ["foo"];
          const $e0_styleBindings$ = ["color"];
          ???
          hostBindings: function MyComponent_HostBindings(rf, ctx, elIndex) {
            if (rf & 1) {
              $r3$.??elementHostAttrs(ctx, $e0_attrs$);
              $r3$.??elementStyling($e0_classBindings$, $e0_styleBindings$, $r3$.??defaultStyleSanitizer, ctx);
            }
            if (rf & 2) {
              $r3$.??elementStylingMap(elIndex, ctx.myClass, ctx.myStyle, ctx);
              $r3$.??elementStyleProp(elIndex, 0, ctx.myColorProp, null, ctx);
              $r3$.??elementClassProp(elIndex, 0, ctx.myFooClass, ctx);
              $r3$.??elementStylingApply(elIndex, ctx);
            }
          },
          consts: 0,
          vars: 0,
          `;

      const result = compile(files, angularFiles);
      expectEmit(result.source, template, 'Incorrect template');
    });

    it('should generate style/class instructions for multiple host binding definitions', () => {
      const files = {
        app: {
          'spec.ts': `
                import {Component, NgModule, HostBinding} from '@angular/core';

                @Component({
                  selector: 'my-component',
                  template: '',
                  host: {
                    '[style.height.pt]': 'myHeightProp',
                    '[class.bar]': 'myBarClass'
                  }
                })
                export class MyComponent {
                  myHeightProp = 20;
                  myBarClass = true;

                  @HostBinding('style')
                  myStyle = {};

                  @HostBinding('style.width')
                  myWidthProp = '500px';

                  @HostBinding('class.foo')
                  myFooClass = true;

                  @HostBinding('class')
                  myClasses = {a:true, b:true};
                }

                @NgModule({declarations: [MyComponent]})
                export class MyModule {}
            `
        }
      };

      const template = `
          const _c0 = ["bar", "foo"];
          const _c1 = ["height", "width"];
          ???
          hostBindings: function MyComponent_HostBindings(rf, ctx, elIndex) {
            if (rf & 1) {
              $r3$.??elementStyling(_c0, _c1, $r3$.??defaultStyleSanitizer, ctx);
            }
            if (rf & 2) {
              $r3$.??elementStylingMap(elIndex, ctx.myClasses, ctx.myStyle, ctx);
              $r3$.??elementStyleProp(elIndex, 0, ctx.myHeightProp, "pt", ctx);
              $r3$.??elementStyleProp(elIndex, 1, ctx.myWidthProp, null, ctx);
              $r3$.??elementClassProp(elIndex, 0, ctx.myBarClass, ctx);
              $r3$.??elementClassProp(elIndex, 1, ctx.myFooClass, ctx);
              $r3$.??elementStylingApply(elIndex, ctx);
            }
          },
          consts: 0,
          vars: 0,
          `;

      const result = compile(files, angularFiles);
      expectEmit(result.source, template, 'Incorrect template');
    });

    it('should generate styling instructions for multiple directives that contain host binding definitions',
       () => {
         const files = {
           app: {
             'spec.ts': `
                import {Directive, Component, NgModule, HostBinding} from '@angular/core';

                @Directive({selector: '[myClassDir]'})
                export class ClassDirective {
                  @HostBinding('class')
                  myClassMap = {red: true};
                }

                @Directive({selector: '[myWidthDir]'})
                export class WidthDirective {
                  @HostBinding('style.width')
                  myWidth = 200;

                  @HostBinding('class.foo')
                  myFooClass = true;
                }

                @Directive({selector: '[myHeightDir]'})
                export class HeightDirective {
                  @HostBinding('style.height')
                  myHeight = 200;

                  @HostBinding('class.bar')
                  myBarClass = true;
                }

                @Component({
                  selector: 'my-component',
                  template: '
                    <div myWidthDir myHeightDir myClassDir></div>
                  ',
                })
                export class MyComponent {
                }

                @NgModule({declarations: [MyComponent, WidthDirective, HeightDirective, ClassDirective]})
                export class MyModule {}
            `
           }
         };

         const template = `
          const $widthDir_classes$ = ["foo"];
          const $widthDir_styles$ = ["width"];
          const $heightDir_classes$ = ["bar"];
          const $heightDir_styles$ = ["height"];
          ???
          function ClassDirective_HostBindings(rf, ctx, elIndex) {
            if (rf & 1) {
              $r3$.??elementStyling(null, null, null, ctx);
            }
            if (rf & 2) {
              $r3$.??elementStylingMap(elIndex, ctx.myClassMap, null, ctx);
              $r3$.??elementStylingApply(elIndex, ctx);
            }
          }
          ???
          function WidthDirective_HostBindings(rf, ctx, elIndex) {
            if (rf & 1) {
              $r3$.??elementStyling($widthDir_classes$, $widthDir_styles$, null, ctx);
            }
            if (rf & 2) {
              $r3$.??elementStyleProp(elIndex, 0, ctx.myWidth, null, ctx);
              $r3$.??elementClassProp(elIndex, 0, ctx.myFooClass, ctx);
              $r3$.??elementStylingApply(elIndex, ctx);
            }
          }
          ???
          function HeightDirective_HostBindings(rf, ctx, elIndex) {
            if (rf & 1) {
              $r3$.??elementStyling($heightDir_classes$, $heightDir_styles$, null, ctx);
            }
            if (rf & 2) {
              $r3$.??elementStyleProp(elIndex, 0, ctx.myHeight, null, ctx);
              $r3$.??elementClassProp(elIndex, 0, ctx.myBarClass, ctx);
              $r3$.??elementStylingApply(elIndex, ctx);
            }
          }
          ???
          `;

         const result = compile(files, angularFiles);
         expectEmit(result.source, template, 'Incorrect template');
       });
  });

  it('should count only non-style and non-class host bindings on Components', () => {
    const files = {
      app: {
        'spec.ts': `
          import {Component, NgModule, HostBinding} from '@angular/core';

          @Component({
            selector: 'my-component',
            template: '',
            host: {
              'style': 'width:200px; height:500px',
              'class': 'foo baz',
              'title': 'foo title'
            }
          })
          export class MyComponent {
            @HostBinding('style')
            myStyle = {width:'100px'};

            @HostBinding('class')
            myClass = {bar:false};

            @HostBinding('id')
            id = 'some id';

            @HostBinding('title')
            title = 'some title';

            @Input('name')
            name = '';
          }

          @NgModule({declarations: [MyComponent]})
          export class MyModule {}
        `
      }
    };

    const template = `
      const $_c0$ = [${AttributeMarker.Classes}, "foo", "baz", ${AttributeMarker.Styles}, "width", "200px", "height", "500px"];
      ???
      hostBindings: function MyComponent_HostBindings(rf, ctx, elIndex) {
        if (rf & 1) {
          $r3$.??allocHostVars(2);
          $r3$.??elementHostAttrs(ctx, $_c0$);
          $r3$.??elementStyling(null, null, $r3$.??defaultStyleSanitizer, ctx);
        }
        if (rf & 2) {
          $r3$.??elementProperty(elIndex, "id", $r3$.??bind(ctx.id), null, true);
          $r3$.??elementProperty(elIndex, "title", $r3$.??bind(ctx.title), null, true);
          $r3$.??elementStylingMap(elIndex, ctx.myClass, ctx.myStyle, ctx);
          $r3$.??elementStylingApply(elIndex, ctx);
        }
      },
      consts: 0,
      vars: 0,
    `;

    const result = compile(files, angularFiles);
    expectEmit(result.source, template, 'Incorrect template');
  });

  it('should count only non-style and non-class host bindings on Directives', () => {
    const files = {
      app: {
        'spec.ts': `
          import {Directive, Component, NgModule, HostBinding} from '@angular/core';

          @Directive({selector: '[myWidthDir]'})
          export class WidthDirective {
            @HostBinding('style.width')
            myWidth = 200;

            @HostBinding('class.foo')
            myFooClass = true;

            @HostBinding('id')
            id = 'some id';

            @HostBinding('title')
            title = 'some title';
          }
        `
      }
    };

    const template = `
      const $_c0$ = ["foo"];
      const $_c1$ = ["width"];
      ???
      hostBindings: function WidthDirective_HostBindings(rf, ctx, elIndex) {
        if (rf & 1) {
          $r3$.??allocHostVars(2);
          $r3$.??elementStyling($_c0$, $_c1$, null, ctx);
        }
        if (rf & 2) {
          $r3$.??elementProperty(elIndex, "id", $r3$.??bind(ctx.id), null, true);
          $r3$.??elementProperty(elIndex, "title", $r3$.??bind(ctx.title), null, true);
          $r3$.??elementStyleProp(elIndex, 0, ctx.myWidth, null, ctx);
          $r3$.??elementClassProp(elIndex, 0, ctx.myFooClass, ctx);
          $r3$.??elementStylingApply(elIndex, ctx);
        }
      }
    `;

    const result = compile(files, angularFiles);
    expectEmit(result.source, template, 'Incorrect template');
  });
});
