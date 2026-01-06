#!/usr/bin/env python3
"""
Script para configurar credenciais de email para Cloud Functions
Uso: python setup_email.py seu-email@gmail.com "sua-app-password"
"""

import sys
import os

def setup_email_credentials():
    """Configura credenciais de email no .env da pasta functions"""
    
    if len(sys.argv) < 3:
        print("❌ Uso incorreto!")
        print("python setup_email.py seu-email@gmail.com 'sua-app-password'")
        print("\n📖 Instruções:")
        print("1. Ative 2FA em sua conta Google: https://myaccount.google.com/security")
        print("2. Gere App Password: https://myaccount.google.com/apppasswords")
        print("3. Cole a senha de 16 caracteres abaixo")
        sys.exit(1)
    
    email = sys.argv[1]
    app_password = sys.argv[2]
    
    # Validações básicas
    if "@" not in email or "." not in email:
        print("❌ Email inválido!")
        sys.exit(1)
    
    if len(app_password) < 10:
        print("❌ App password muito curta! Deve ter pelo menos 10 caracteres")
        sys.exit(1)
    
    # Caminho do arquivo .env
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    
    # Conteúdo do arquivo
    env_content = f"""# Email configuration
EMAIL_USER={email}
EMAIL_PASSWORD={app_password}
"""
    
    # Escrever arquivo
    try:
        with open(env_path, 'w') as f:
            f.write(env_content)
        print(f"✅ Credenciais configuradas com sucesso!")
        print(f"📧 Email: {email}")
        print(f"🔑 App Password: {'*' * (len(app_password) - 4)}{app_password[-4:]}")
        print(f"📁 Arquivo: {env_path}")
        print("\n🚀 Próximo passo: firebase deploy --only functions")
    except Exception as e:
        print(f"❌ Erro ao escrever arquivo: {e}")
        sys.exit(1)

if __name__ == '__main__':
    setup_email_credentials()
