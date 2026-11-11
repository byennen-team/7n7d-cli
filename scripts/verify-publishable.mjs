#!/usr/bin/env node
/**
 * Prove the CLI is publishable.
 *
 * @7n7d/sdk is not on npm, so it cannot be a runtime dependency of the
 * published package: it is bundled into dist/ and kept as a build-only
 * devDependency. This script stages the release manifest (the build-only
 * local-path entry removed), packs it, checks the packed manifest, installs
 * the tarball into a clean consumer directory outside the checkout and runs
 * the installed binary.
 *
 * It runs as npm's prepublishOnly hook, so a publish can never ship an
 * artifact that a consumer cannot install.
 */
import { createRunner } from './lib/exec.mjs'
import { verifyPublishable } from './lib/publish-verification.mjs'

const tarball = verifyPublishable({ run: createRunner() })
console.log('publishable artifact verified: ' + tarball)
