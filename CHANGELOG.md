# Changelog

## [1.14.1](https://github.com/quirrel-dev/quirrel/compare/v1.14.0...v1.14.1) (2023-06-26)


### Bug Fixes

* add node 20 support ([#1153](https://github.com/quirrel-dev/quirrel/issues/1153)) ([0584045](https://github.com/quirrel-dev/quirrel/commit/0584045a3afacdfb144a8e09fc222bd2d7aa3655))
* dead links ([139c74c](https://github.com/quirrel-dev/quirrel/commit/139c74c42bdbe27f9b9f768dd0a13b55c1f0ab3d))

## [1.14.0](https://github.com/quirrel-dev/quirrel/compare/v1.13.4...v1.14.0) (2023-06-20)


### Features

* added nextjs 13 app router native support & docs improvements ([91a3d93](https://github.com/quirrel-dev/quirrel/commit/91a3d93347f68d121fb1b835e65d0ee2488249c6))


### Bug Fixes

* **deps:** update dependency @fastify/basic-auth to v5 ([#1107](https://github.com/quirrel-dev/quirrel/issues/1107)) ([c3cc7cf](https://github.com/quirrel-dev/quirrel/commit/c3cc7cf0a522f3908ac951226e2b4eed67358904))
* **deps:** update dependency fastify to v4.10.2 [security] ([#1126](https://github.com/quirrel-dev/quirrel/issues/1126)) ([f9d4494](https://github.com/quirrel-dev/quirrel/commit/f9d4494bf56d72a86865bdbf54d9ea1a55717428))
* **deps:** update dependency jsonwebtoken to v9 [security] ([#1112](https://github.com/quirrel-dev/quirrel/issues/1112)) ([55188c7](https://github.com/quirrel-dev/quirrel/commit/55188c74698e8f4a92a4c1b19ff21a5bb600aaff))

## [1.13.4](https://github.com/quirrel-dev/quirrel/compare/v1.13.3...v1.13.4) (2023-04-03)


### Bug Fixes

* add node v19 support (previous commit didn't rigger automation) ([be7b368](https://github.com/quirrel-dev/quirrel/commit/be7b36895a04b13931c5f49ce90aacf1e9618cd7))

## [1.13.3](https://github.com/quirrel-dev/quirrel/compare/v1.13.2...v1.13.3) (2023-04-03)


### Bug Fixes

* update sveltekit `Request` type ([#1131](https://github.com/quirrel-dev/quirrel/issues/1131)) ([2197fcd](https://github.com/quirrel-dev/quirrel/commit/2197fcd914c07cd11d113383cbf3bba500db51b2))

## [1.13.2](https://github.com/quirrel-dev/quirrel/compare/v1.13.1...v1.13.2) (2023-02-16)


### Bug Fixes

* remove broken tutorial link ([#1119](https://github.com/quirrel-dev/quirrel/issues/1119)) ([df0288e](https://github.com/quirrel-dev/quirrel/commit/df0288e1ed3362bcc8cfb79e3b4b065c735badbc))
* respect custom host in local dev ([#1122](https://github.com/quirrel-dev/quirrel/issues/1122)) ([71304ff](https://github.com/quirrel-dev/quirrel/commit/71304ff68faa09fe525db6df155779caf9ee98ba)), closes [#1121](https://github.com/quirrel-dev/quirrel/issues/1121)

## [1.13.1](https://github.com/quirrel-dev/quirrel/compare/v1.13.0...v1.13.1) (2022-11-07)


### Bug Fixes

* correctly default --no-cron ([#1091](https://github.com/quirrel-dev/quirrel/issues/1091)) ([1cbe816](https://github.com/quirrel-dev/quirrel/commit/1cbe81644e5ffb6f188e08dff1383454f1e59d0b)), closes [#1089](https://github.com/quirrel-dev/quirrel/issues/1089)

## [1.13.0](https://github.com/quirrel-dev/quirrel/compare/v1.12.0...v1.13.0) (2022-11-01)


### Features

* allow passing a logger function to quirrel client ([#1039](https://github.com/quirrel-dev/quirrel/issues/1039)) ([398f53a](https://github.com/quirrel-dev/quirrel/commit/398f53a053d18f56ed1a99ec67066003f413c6c4))
* SvelteKit update ([#1082](https://github.com/quirrel-dev/quirrel/issues/1082)) ([8596694](https://github.com/quirrel-dev/quirrel/commit/8596694038b76154b030868698f2ba75548309aa))


### Bug Fixes

* **deps:** update dependency @types/node to v18 ([#1083](https://github.com/quirrel-dev/quirrel/issues/1083)) ([565e5a8](https://github.com/quirrel-dev/quirrel/commit/565e5a8604cb326ee422784de75af0578e443dc2))
* **deps:** update docusaurus monorepo to v2.2.0 ([#1086](https://github.com/quirrel-dev/quirrel/issues/1086)) ([5e219b9](https://github.com/quirrel-dev/quirrel/commit/5e219b986cdfe5ba5ed383e616530533126ac438))

## [1.12.0](https://github.com/quirrel-dev/quirrel/compare/v1.11.0...v1.12.0) (2022-10-21)


### Features

* update owl, ioredis, ioredis-mock ([#1036](https://github.com/quirrel-dev/quirrel/issues/1036)) ([d328c7d](https://github.com/quirrel-dev/quirrel/commit/d328c7d8aaeb57b70ef6ca3b85d55aa902fb102c))


### Bug Fixes

* **deps:** update dependency @quirrel/owl to ^0.15.0 ([#1066](https://github.com/quirrel-dev/quirrel/issues/1066)) ([4e6eed4](https://github.com/quirrel-dev/quirrel/commit/4e6eed4401a93f820fec0667bfa31879bbc2e19a))
* typo in CronDetector searchpath ([#1058](https://github.com/quirrel-dev/quirrel/issues/1058)) ([0635fd5](https://github.com/quirrel-dev/quirrel/commit/0635fd5e1fe7fe3e27b3cee7fd56a68347c22423))

## [1.11.0](https://github.com/quirrel-dev/quirrel/compare/v1.10.0...v1.11.0) (2022-10-21)


### Features

* support node v18 ([#1047](https://github.com/quirrel-dev/quirrel/issues/1047)) ([2d520e0](https://github.com/quirrel-dev/quirrel/commit/2d520e0f6f736f049c3eb016c300fb907a2bd8a5))
* support node v18 ([#1057](https://github.com/quirrel-dev/quirrel/issues/1057)) ([a306f8e](https://github.com/quirrel-dev/quirrel/commit/a306f8e66d9f04f053dbc2b3d5b0d5e018de2245))


### Bug Fixes

* **deps:** update dependency conditional-type-checks to v1.0.6 ([#1060](https://github.com/quirrel-dev/quirrel/issues/1060)) ([7084e8d](https://github.com/quirrel-dev/quirrel/commit/7084e8d91dae50299e8a236f847986c19e77a84e))
* **deps:** update dependency fastify-plugin to v4 ([#1070](https://github.com/quirrel-dev/quirrel/issues/1070)) ([913f202](https://github.com/quirrel-dev/quirrel/commit/913f202b4a0d525f7bdd033b971545fc329e9466))
* update fastify + others ([#1055](https://github.com/quirrel-dev/quirrel/issues/1055)) ([7404f84](https://github.com/quirrel-dev/quirrel/commit/7404f849ef4df6672896759d4abcb66761a35da0))
* update some deps ([#1046](https://github.com/quirrel-dev/quirrel/issues/1046)) ([6f3a8b7](https://github.com/quirrel-dev/quirrel/commit/6f3a8b7aee7d8578c784c583ae014af09ed69fb1))
