# Gielenor Launcher

## Desenvolvimento
- Instalar dependencias: `npm install`
- Rodar em modo dev: `npm start`

## Build (electron-builder)
- Windows: `npm run dist -- --win`
- Linux: `npm run dist -- --linux`
- macOS: `npm run dist -- --mac`

Ou tudo de uma vez: `npm run dist`

Os arquivos finais ficam em `dist/`.

## Icones
O arquivo base esta em `src/assets/imagens/icone.png`.
Voce precisa gerar os arquivos de build:
- `build/icon.ico` (Windows)
- `build/icon.icns` (macOS)
- `build/icon.png` (Linux)

No repo foi criado `build/icon.png` a partir do PNG base. Gere os demais usando sua ferramenta preferida
(ex: ImageMagick, png2ico, iconutil).

## Code signing (opcional)
- Windows: use `CSC_LINK` e `CSC_KEY_PASSWORD` se tiver certificado.
- macOS: use `APPLE_ID`, `APPLE_ID_PASS` e `TEAM_ID` se quiser notarizacao.

Se nao houver certificados, o build continua normalmente.

## Resources empacotados
- `src/jre/` e `src/assets/` sao copiados para `process.resourcesPath/jre` e `process.resourcesPath/assets`.
- O codigo resolve caminhos de assets e JRE automaticamente (dev vs producao).
