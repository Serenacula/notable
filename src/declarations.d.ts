
/* MODULE DECLARATIONS */

/* Override unstated-connect2 to give the selector callback a contextual type,
   eliminating noImplicitAny errors in connect() selector destructuring. */
declare module 'unstated-connect2' {
  interface ConnectOptions {
    container?: any;
    containers?: any[];
    store?: any;
    stores?: any[];
    selector?: ( props: Record<string, any> ) => Record<string, any>;
    render?: any;
    shouldComponentUpdate?: boolean;
  }
  function connect ( options?: ConnectOptions ): ( WrappedComponent: any ) => any;
  const _default: typeof connect & { default: typeof connect };
  namespace _default {
    export type type = typeof connect;
  }
  export = _default;
}

declare module 'electron-store' {
  class Store {
    constructor ( options?: Record<string, any> );
    get ( key: string, defaultValue?: any ): any;
    set ( key: string, value: any ): void;
    set ( object: Record<string, any> ): void;
    has ( key: string ): boolean;
    delete ( key: string ): void;
    clear (): void;
    store: Record<string, any>;
    size: number;
    path: string;
    readonly name: string;
  }
  export = Store;
}

declare module 'is-shallow-equal' {
  function isShallowEqual ( a: any, b: any ): boolean;
  export = isShallowEqual;
}

declare module 'is-absolute-url' {
  function isAbsoluteUrl ( url: string ): boolean;
  export = isAbsoluteUrl;
}

declare module 'markdown-it-task-lists' {
  import MarkdownIt from 'markdown-it';
  function taskLists ( md: MarkdownIt, options?: { enabled?: boolean; label?: boolean; labelAfter?: boolean } ): void;
  export = taskLists;
}

declare module 'js-yaml' {
  export function load ( input: string, options?: any ): any;
  export function dump ( object: any, options?: any ): string;
  export function safeLoad ( input: string, options?: any ): any;
  export function safeDump ( object: any, options?: any ): string;
}

declare module 'monaco-editor/esm/vs/editor/browser/editorExtensions.js' {
  export const EditorExtensionsRegistry: any;
  export class Command { [key: string]: any; }
  export class EditorCommand extends Command { constructor ( ...args: any[] ); [key: string]: any; }
}

declare module 'monaco-editor/esm/vs/editor/common/editorContextKeys.js' {
  export const EditorContextKeys: any;
}

declare module 'monaco-editor/esm/vs/basic-languages/markdown/markdown.js' {
  export const language: any;
  export const conf: any;
}

/* GLOBALS */

declare const __non_webpack_require__: NodeRequire;
