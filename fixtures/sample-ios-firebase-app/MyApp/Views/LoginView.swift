import SwiftUI
import FirebaseAuth

struct LoginView: View {
    @StateObject private var authManager = AuthManager.shared
    @State private var email: String = ""
    @State private var password: String = ""
    @State private var showingSignUp: Bool = false
    @State private var showingPasswordReset: Bool = false

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Logo
                Image(systemName: "person.circle.fill")
                    .resizable()
                    .frame(width: 100, height: 100)
                    .foregroundColor(.blue)
                    .padding(.bottom, 30)

                // Email Field
                TextField("Email", text: $email)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .autocapitalization(.none)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)

                // Password Field
                SecureField("Password", text: $password)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .textContentType(.password)

                // Error Message
                if let error = authManager.errorMessage {
                    Text(error)
                        .foregroundColor(.red)
                        .font(.caption)
                }

                // Sign In Button
                Button(action: signIn) {
                    if authManager.isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Sign In")
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(10)
                .disabled(authManager.isLoading)

                // Sign Up Link
                Button("Don't have an account? Sign Up") {
                    showingSignUp = true
                }
                .font(.footnote)

                // Forgot Password Link
                Button("Forgot Password?") {
                    showingPasswordReset = true
                }
                .font(.footnote)
                .foregroundColor(.gray)
            }
            .padding()
            .navigationTitle("Welcome")
            .sheet(isPresented: $showingSignUp) {
                SignUpView()
            }
            .sheet(isPresented: $showingPasswordReset) {
                PasswordResetView()
            }
        }
    }

    private func signIn() {
        Task {
            do {
                try await authManager.signIn(email: email, password: password)
            } catch {
                print("Sign in failed: \(error)")
            }
        }
    }
}

struct SignUpView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var authManager = AuthManager.shared
    @State private var email: String = ""
    @State private var password: String = ""
    @State private var confirmPassword: String = ""

    var body: some View {
        NavigationView {
            Form {
                Section {
                    TextField("Email", text: $email)
                        .autocapitalization(.none)
                        .keyboardType(.emailAddress)
                    SecureField("Password", text: $password)
                    SecureField("Confirm Password", text: $confirmPassword)
                }

                Section {
                    Button("Create Account") {
                        Task {
                            try? await authManager.createAccount(email: email, password: password)
                            dismiss()
                        }
                    }
                    .disabled(password != confirmPassword || password.isEmpty)
                }
            }
            .navigationTitle("Sign Up")
            .navigationBarItems(trailing: Button("Cancel") { dismiss() })
        }
    }
}

struct PasswordResetView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var authManager = AuthManager.shared
    @State private var email: String = ""
    @State private var messageSent: Bool = false

    var body: some View {
        NavigationView {
            Form {
                Section(footer: Text("We'll send you an email to reset your password.")) {
                    TextField("Email", text: $email)
                        .autocapitalization(.none)
                        .keyboardType(.emailAddress)
                }

                Section {
                    Button("Send Reset Email") {
                        Task {
                            try? await authManager.sendPasswordReset(email: email)
                            messageSent = true
                        }
                    }
                    .disabled(email.isEmpty)
                }

                if messageSent {
                    Section {
                        Text("Password reset email sent!")
                            .foregroundColor(.green)
                    }
                }
            }
            .navigationTitle("Reset Password")
            .navigationBarItems(trailing: Button("Done") { dismiss() })
        }
    }
}

#Preview {
    LoginView()
}
