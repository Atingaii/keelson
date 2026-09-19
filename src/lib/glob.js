/** Minimal glob → RegExp: supports **, *, ?, and {a,b}. Posix separators. */
export function globToRegExp(glob) {
  let re = '';
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // '**/' matches zero or more directories; bare '**' matches anything
        if (glob[i + 2] === '/') {
          re += '(?:.*/)?';
          i += 3;
        } else {
          re += '.*';
          i += 2;
        }
      } else {
        re += '[^/]*';
        i += 1;
      }
    } else if (c === '?') {
      re += '[^/]';
      i += 1;
    } else if (c === '{') {
      const end = glob.indexOf('}', i);
      if (end === -1) {
        re += '\\{';
        i += 1;
      } else {
        const alts = glob.slice(i + 1, end).split(',').map(escape);
        re += `(?:${alts.join('|')})`;
        i = end + 1;
      }
    } else {
      re += escape(c);
      i += 1;
    }
  }
  return new RegExp(`^${re}$`);
}

const escape = (s) => s.replace(/[.+^$()|[\]\\]/g, '\\$&');

export function globMatch(glob, filePath) {
  const p = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  const g = glob.replace(/^\.\//, '');
  if (globToRegExp(g).test(p)) return true;
  // A directory-style glob like "src/api/" or "src/api" matches everything beneath it.
  if (!/[*?{]/.test(g)) {
    const dir = g.replace(/\/$/, '');
    return p === dir || p.startsWith(dir + '/');
  }
  return false;
}
