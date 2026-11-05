package com.hobbydiscovery.googleid

import android.content.MutableContextWrapper
import androidx.credentials.CredentialManager
import androidx.credentials.CredentialOption
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class GoogleIdModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("GoogleId")

    /**
     * Shows the Android Google account sheet and resolves to a Google ID token,
     * or null when the user dismisses it. `hashedNonce` ends up in the token's
     * `nonce` claim; the server compares it with the raw nonce.
     */
    AsyncFunction("signIn") Coroutine { webClientId: String, hashedNonce: String ->
      val activity = appContext.throwingActivity
      val manager = CredentialManager.create(activity)

      suspend fun request(option: CredentialOption): String? {
        val response = try {
          manager.getCredential(
            context = MutableContextWrapper(activity),
            request = GetCredentialRequest.Builder().addCredentialOption(option).build(),
          )
        } catch (e: GetCredentialCancellationException) {
          return null
        }
        val credential = response.credential
        if (credential is CustomCredential &&
          credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
        ) {
          return GoogleIdTokenCredential.createFrom(credential.data).idToken
        }
        throw CodedException("ERR_GOOGLE_ID_CREDENTIAL", "Google returned an unexpected credential.", null)
      }

      try {
        // The bottom sheet with every Google account on the phone.
        request(
          GetGoogleIdOption.Builder()
            .setFilterByAuthorizedAccounts(false)
            .setServerClientId(webClientId)
            .setNonce(hashedNonce)
            .build(),
        )
      } catch (e: NoCredentialException) {
        // No account on the phone, or sign-in prompts are turned off:
        // this dialog also lets the user add an account.
        try {
          request(GetSignInWithGoogleOption.Builder(webClientId).setNonce(hashedNonce).build())
        } catch (e: GetCredentialException) {
          throw CodedException("ERR_GOOGLE_ID_${e.type}", e.message ?: "Google sign-in failed.", e)
        }
      } catch (e: GetCredentialException) {
        throw CodedException("ERR_GOOGLE_ID_${e.type}", e.message ?: "Google sign-in failed.", e)
      }
    }
  }
}
