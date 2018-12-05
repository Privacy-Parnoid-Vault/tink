// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////////

goog.module('tink.subtle.EciesAeadHkdfHybridEncryptTest');
goog.setTestOnly('tink.subtle.EciesAeadHkdfHybridEncryptTest');

const AeadConfig = goog.require('tink.aead.AeadConfig');
const AeadKeyTemplates = goog.require('tink.aead.AeadKeyTemplates');
const Ecdh = goog.require('tink.subtle.webcrypto.Ecdh');
const EciesAeadHkdfHybridEncrypt = goog.require('tink.subtle.EciesAeadHkdfHybridEncrypt');
const EllipticCurves = goog.require('tink.subtle.EllipticCurves');
const Random = goog.require('tink.subtle.Random');
const Registry = goog.require('tink.Registry');
const RegistryEciesAeadHkdfDemHelper = goog.require('tink.hybrid.RegistryEciesAeadHkdfDemHelper');
const TestCase = goog.require('goog.testing.TestCase');
const testSuite = goog.require('goog.testing.testSuite');
const userAgent = goog.require('goog.userAgent');

testSuite({
  shouldRunTests() {
    return !userAgent.EDGE;  // b/120286783
  },

  setUp() {
    AeadConfig.register();
    // Use a generous promise timeout for running continuously.
    TestCase.getActiveTestCase().promiseTimeout = 1000 * 1000;  // 1000s
  },

  tearDown() {
    Registry.reset();
    // Reset the timeout.
    TestCase.getActiveTestCase().promiseTimeout = 1000;  // 1s
  },

  async testNewInstance_shouldWork() {
    const keyPair = await Ecdh.generateKeyPair('P-256');
    const publicKey = await Ecdh.exportCryptoKey(keyPair.publicKey);
    const hkdfHash = 'SHA-256';
    const pointFormat = EllipticCurves.PointFormatType.UNCOMPRESSED;
    const demHelper = new RegistryEciesAeadHkdfDemHelper(
        AeadKeyTemplates.aes128CtrHmacSha256());

    await EciesAeadHkdfHybridEncrypt.newInstance(
        publicKey, hkdfHash, pointFormat, demHelper);
  },

  async testNewInstance_nullParameters() {
    const keyPair = await Ecdh.generateKeyPair('P-256');
    const publicKey = await Ecdh.exportCryptoKey(keyPair.publicKey);
    const hkdfHash = 'SHA-256';
    const pointFormat = EllipticCurves.PointFormatType.UNCOMPRESSED;
    const demHelper = new RegistryEciesAeadHkdfDemHelper(
        AeadKeyTemplates.aes128CtrHmacSha256());

    try {
      await EciesAeadHkdfHybridEncrypt.newInstance(
          null, hkdfHash, pointFormat, demHelper);
      fail('Should throw an exception.');
    } catch (e) {
      assertEquals(
          'CustomError: Recipient public key has to be non-null.',
          e.toString());
    }

    try {
      await EciesAeadHkdfHybridEncrypt.newInstance(
          publicKey, null, pointFormat, demHelper);
      fail('Should throw an exception.');
    } catch (e) {
      assertEquals(
          'CustomError: HMAC algorithm has to be non-null.', e.toString());
    }

    try {
      await EciesAeadHkdfHybridEncrypt.newInstance(
          publicKey, hkdfHash, null, demHelper);
      fail('Should throw an exception.');
    } catch (e) {
      assertEquals(
          'CustomError: Point format has to be non-null.', e.toString());
    }

    try {
      await EciesAeadHkdfHybridEncrypt.newInstance(
          publicKey, hkdfHash, pointFormat, null);
      fail('Should throw an exception.');
    } catch (e) {
      assertEquals('CustomError: DEM helper has to be non-null.', e.toString());
    }
  },

  async testEncrypt_differentArguments() {
    const hkdfSalt = new Uint8Array(0);
    const pointFormat = EllipticCurves.PointFormatType.UNCOMPRESSED;
    const demHelper = new RegistryEciesAeadHkdfDemHelper(
        AeadKeyTemplates.aes256CtrHmacSha256());
    const hmacAlgorithms = ['SHA-1', 'SHA-256', 'SHA-512'];

    // Test the encryption for different HMAC algorithms and different types of
    // curves.
    for (let hkdfHash of hmacAlgorithms) {
      for (let curve of Object.keys(EllipticCurves.CurveType)) {
        const curveName =
            EllipticCurves.curveToString(EllipticCurves.CurveType[curve]);
        const keyPair = await Ecdh.generateKeyPair(curveName);
        const publicKey = await Ecdh.exportCryptoKey(keyPair.publicKey);

        const hybridEncrypt = await EciesAeadHkdfHybridEncrypt.newInstance(
            publicKey, hkdfHash, pointFormat, demHelper, hkdfSalt);

        const plaintext = Random.randBytes(15);
        const ciphertext = await hybridEncrypt.encrypt(plaintext);

        assertObjectNotEquals(plaintext, ciphertext);
      }
    }
  },
});
