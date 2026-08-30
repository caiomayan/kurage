# Third-party notices and asset policy

Kurage contains or integrates third-party software, services, names and visual
assets. The proprietary repository license does not replace any third-party
license or grant rights in third-party property.

## CounterStrikeSharp

The projects under `server/plugins` reference the published
`CounterStrikeSharp.API` .NET package. CounterStrikeSharp is distributed under
GPL-3.0 with a special exception allowing derivative plugins, extensions and
software referencing its published .NET packages to be licensed under MIT.
Accordingly, Kurage's plugin source is separately licensed under MIT.

- Project: https://github.com/roflmuffin/CounterStrikeSharp
- License and special exception:
  https://github.com/roflmuffin/CounterStrikeSharp/blob/main/LICENSE

## cs2-inventory-simulator and 3d.cstrike.app viewer integration

The Kurage inventory studio adapts the embed protocol and viewer integration
patterns from Ian Lucas' `cs2-inventory-simulator` project. Adapted source files
retain an attribution header. The upstream project is distributed under the MIT
License:

- Project: https://github.com/ianlucas/cs2-inventory-simulator
- Copyright (c) 2023-present Ian Lucas

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Valve, Steam and Counter-Strike

Counter-Strike, Counter-Strike 2, CS2, Steam, Valve and their logos, map names,
game imagery and related assets are trademarks or property of Valve Corporation
and/or their respective owners. Kurage is an independent project and is not
affiliated with, sponsored by, or endorsed by Valve. Steam data and login are
subject to Valve's applicable terms and API policies.

## FACEIT and other services

FACEIT and its marks are property of their respective owner. Kurage's optional
integration does not imply endorsement or partnership. Cloudflare, Mercado Pago,
DatHost and every other referenced provider retain their respective marks and
terms.

## Dependency licenses

Java, JavaScript, .NET and container dependencies retain their own licenses.
Before every release, generate and archive an SBOM and dependency-license report
for the exact build. Any dependency whose terms are incompatible with the
intended distribution must be removed or separately licensed.

## Repository assets

The current workspace contains map thumbnails, game-related imagery, FACEIT
level artwork and externally hosted team logos. Their presence is not evidence
that commercial redistribution or public portfolio publication is authorized.
Before publishing a case study or launching the service:

1. record the source, author, license and permitted use for each asset;
2. replace unverified material with original, licensed or provider-approved
   assets;
3. host runtime media outside Git where practical; and
4. retain attribution where the applicable license requires it.
