.PHONY: dev db seed generate

dev:
	pnpm dev

db:
	pnpm db:generate
	pnpm db:seed

seed:
	pnpm db:seed

generate:
	pnpm db:generate
