package com.example.myapp.auth

import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.tasks.await

/**
 * Manages Firebase authentication state for the app
 */
class AuthManager {
    private val auth: FirebaseAuth = FirebaseAuth.getInstance()

    private val _currentUser = MutableStateFlow<FirebaseUser?>(null)
    val currentUser: StateFlow<FirebaseUser?> = _currentUser.asStateFlow()

    private val _isAuthenticated = MutableStateFlow(false)
    val isAuthenticated: StateFlow<Boolean> = _isAuthenticated.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    init {
        // Set up auth state listener
        auth.addAuthStateListener { firebaseAuth ->
            _currentUser.value = firebaseAuth.currentUser
            _isAuthenticated.value = firebaseAuth.currentUser != null
        }
    }

    /**
     * Sign in with email and password
     */
    suspend fun signIn(email: String, password: String): Result<FirebaseUser> {
        return try {
            _isLoading.value = true
            _errorMessage.value = null

            val result = auth.signInWithEmailAndPassword(email, password).await()
            val user = result.user ?: throw Exception("User is null after sign in")

            _currentUser.value = user
            _isAuthenticated.value = true
            _isLoading.value = false

            Result.success(user)
        } catch (e: Exception) {
            Log.e(TAG, "Sign in failed", e)
            _errorMessage.value = e.localizedMessage
            _isLoading.value = false
            Result.failure(e)
        }
    }

    /**
     * Create a new account with email and password
     */
    suspend fun createAccount(email: String, password: String): Result<FirebaseUser> {
        return try {
            _isLoading.value = true
            _errorMessage.value = null

            val result = auth.createUserWithEmailAndPassword(email, password).await()
            val user = result.user ?: throw Exception("User is null after account creation")

            _currentUser.value = user
            _isAuthenticated.value = true
            _isLoading.value = false

            Result.success(user)
        } catch (e: Exception) {
            Log.e(TAG, "Account creation failed", e)
            _errorMessage.value = e.localizedMessage
            _isLoading.value = false
            Result.failure(e)
        }
    }

    /**
     * Sign out the current user
     */
    fun signOut() {
        auth.signOut()
        _currentUser.value = null
        _isAuthenticated.value = false
    }

    /**
     * Send password reset email
     */
    suspend fun sendPasswordReset(email: String): Result<Unit> {
        return try {
            _isLoading.value = true
            _errorMessage.value = null

            auth.sendPasswordResetEmail(email).await()
            _isLoading.value = false

            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Password reset failed", e)
            _errorMessage.value = e.localizedMessage
            _isLoading.value = false
            Result.failure(e)
        }
    }

    companion object {
        private const val TAG = "AuthManager"

        @Volatile
        private var instance: AuthManager? = null

        fun getInstance(): AuthManager {
            return instance ?: synchronized(this) {
                instance ?: AuthManager().also { instance = it }
            }
        }
    }
}
