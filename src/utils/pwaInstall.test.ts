import { describe, expect, it } from 'vitest'
import { detectInstallMethod } from './pwaInstall'

const UA = {
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  firefoxAndroid: 'Mozilla/5.0 (Android 14; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0',
  safariIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  facebookAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-S911B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/490.0.0.0;]',
  instagramIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 357.0.0',
  chromeDesktop:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
}

const base = { standalone: false, canPrompt: false, touchMac: false }

describe("méthode d'installation", () => {
  it('rien à proposer si l’app est déjà installée', () => {
    expect(detectInstallMethod(UA.chromeAndroid, { ...base, standalone: true, canPrompt: true })).toBe('none')
  })

  it('bouton Installer quand le navigateur le permet', () => {
    expect(detectInstallMethod(UA.chromeAndroid, { ...base, canPrompt: true })).toBe('prompt')
  })

  it('navigateur Facebook ou Instagram : ouvrir dans le vrai navigateur', () => {
    expect(detectInstallMethod(UA.facebookAndroid, base)).toBe('in-app')
    expect(detectInstallMethod(UA.instagramIphone, base)).toBe('in-app')
    expect(detectInstallMethod(UA.facebookAndroid, { ...base, canPrompt: true })).toBe('in-app')
  })

  it('iPhone : Partager puis Sur l’écran d’accueil', () => {
    expect(detectInstallMethod(UA.safariIphone, base)).toBe('ios')
  })

  it('Android sans bouton (Firefox, Chrome avant la proposition) : menu', () => {
    expect(detectInstallMethod(UA.firefoxAndroid, base)).toBe('android')
    expect(detectInstallMethod(UA.chromeAndroid, base)).toBe('android')
  })

  it('ordinateur sans proposition : pas de bandeau', () => {
    expect(detectInstallMethod(UA.chromeDesktop, base)).toBe('none')
  })
})
