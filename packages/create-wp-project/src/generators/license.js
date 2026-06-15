/**
 * @wpsk/create-wp-project — license generator (Phase 21).
 *
 * License file (LICENSE) + composer.json `license` field. The
 * full LICENSE file bodies land in Phase 25.G; Phase 21 emits
 * a minimal file with the SPDX header and a one-line
 * permission grant. The `composer.json` `license` field is
 * already set by core (it reads `features.license`); this
 * generator's only file contribution is `LICENSE` itself.
 *
 * The license is always emitted (every license variant in
 * the catalog is a real license — there's no "off" value).
 * The registry gate is `features.license` being truthy.
 */

const LICENSE_BODIES = {
  gpl2: `                    GNU GENERAL PUBLIC LICENSE
                       Version 2, June 1991

 Copyright (C) 2026 {{globalName}} authors

 This program is free software; you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation; either version 2 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program; if not, write to the Free Software
 Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA
 02110-1301, USA.
`,
  gpl3: `                    GNU GENERAL PUBLIC LICENSE
                       Version 3, 29 June 2007

 Copyright (C) 2026 {{globalName}} authors

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
`,
  mit: `MIT License

 Copyright (c) 2026 {{globalName}} authors

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
`,
};

export function run(ctx) {
  const variant = ctx.features.license;
  if (!variant || !LICENSE_BODIES[variant]) {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  const tpl = ctx.vars || { ...ctx.answers, ...(ctx.cfg || {}) };
  return {
    files: {
      LICENSE: LICENSE_BODIES[variant].replace(
        /\{\{globalName\}\}/g,
        tpl.globalName || tpl.slug || "wp-starter-kit",
      ),
    },
    dirs: [],
    deps: {},
    devDeps: {},
  };
}

export const descriptor = {
  id: "license",
  feature: "license",
  owns: ["LICENSE"],
  run,
};
