import Foundation
import FirebaseAuth
import FirebaseCore

/// Manages authentication state for the app
class AuthManager: ObservableObject {
    @Published var user: User?
    @Published var isAuthenticated: Bool = false
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    private var authStateHandler: AuthStateDidChangeListenerHandle?

    static let shared = AuthManager()

    init() {
        setupAuthStateListener()
    }

    deinit {
        if let handle = authStateHandler {
            Auth.auth().removeStateDidChangeListener(handle)
        }
    }

    // MARK: - Auth State Listener

    private func setupAuthStateListener() {
        authStateHandler = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            DispatchQueue.main.async {
                self?.user = user
                self?.isAuthenticated = user != nil
            }
        }
    }

    // MARK: - Sign In with Email

    func signIn(email: String, password: String) async throws {
        isLoading = true
        errorMessage = nil

        do {
            let result = try await Auth.auth().signIn(withEmail: email, password: password)
            DispatchQueue.main.async {
                self.user = result.user
                self.isAuthenticated = true
                self.isLoading = false
            }
        } catch {
            DispatchQueue.main.async {
                self.errorMessage = error.localizedDescription
                self.isLoading = false
            }
            throw error
        }
    }

    // MARK: - Create Account

    func createAccount(email: String, password: String) async throws {
        isLoading = true
        errorMessage = nil

        do {
            let result = try await Auth.auth().createUser(withEmail: email, password: password)
            DispatchQueue.main.async {
                self.user = result.user
                self.isAuthenticated = true
                self.isLoading = false
            }
        } catch {
            DispatchQueue.main.async {
                self.errorMessage = error.localizedDescription
                self.isLoading = false
            }
            throw error
        }
    }

    // MARK: - Sign Out

    func signOut() throws {
        try Auth.auth().signOut()
        DispatchQueue.main.async {
            self.user = nil
            self.isAuthenticated = false
        }
    }

    // MARK: - Password Reset

    func sendPasswordReset(email: String) async throws {
        try await Auth.auth().sendPasswordReset(withEmail: email)
    }
}
