# LakeWire-web

Marketing and docs UI for LakeWire. The implementation lives in [SunilMaurya-18/LakeWire](https://github.com/SunilMaurya-18/LakeWire). Live site: [lakewire.vercel.app](https://lakewire.vercel.app/).

## Run

Node 22 LTS (`engines`: `>=20 <23`).

```text
npm ci
npm run dev
```

Production build:

```text
npm run build
npm start
```

`/` serves `public/home.html`. App Router pages: `/docs`, `/architecture`, `/research`, `/world`, `/writepath`, `/motion/[id]`.
