# Bentocord Examples

### How do I run an example?

Build Bentocord project (directory above)
```bash
cd .. && yarn run build
# or
cd .. && npm run build
```

Install and build Bentocord examples:
```bash
yarn install && yarn run build # `yarn upgrade --latest` on subsequent calls
# or
npm install && npm run build
```

Determine the example you want to run (ex: `basic`) then execute the following
```bash
node build/{exampleName}

# ex: if I wanted to run basic
node build/basic
```
