// Chrome extension API types declaration

declare namespace chrome {
  namespace storage {
    namespace sync {
      function get(keys: null | string | string[] | Record<string, any>, callback: (items: Record<string, any>) => void): void;
      function set(items: Record<string, any>, callback?: () => void): void;
    }
  }
  namespace runtime {
    function getURL(path: string): string;
    function openOptionsPage(callback?: () => void): void;
  }
}

declare const chrome: typeof chrome;
