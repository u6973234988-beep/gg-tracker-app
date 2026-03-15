'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export default function RegistrationPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Le password non corrispondono');
      return;
    }

    if (password.length < 6) {
      toast.error('La password deve essere di almeno 6 caratteri');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        toast.error(error.message || 'Errore durante la registrazione');
        return;
      }

      setIsSubmitted(true);
      toast.success('Registrazione completata!');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Errore durante la registrazione. Riprova più tardi.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background-dark via-background-darker to-background-dark flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Card className="border-border-light/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-lg bg-success/20">
                  <span className="text-2xl">✓</span>
                </div>
                <h2 className="text-2xl font-bold text-text-primary">Registrazione riuscita!</h2>
                <p className="text-text-secondary">
                  Controlla la tua email per confermare la registrazione.
                </p>
                <Link
                  href="/login"
                  className="inline-block mt-4 text-primary-500 hover:text-primary-400 font-medium transition-colors"
                >
                  Torna al login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-dark via-background-darker to-background-dark flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 mb-4">
            <span className="text-xl font-bold text-white">GG</span>
          </div>
          <h1 className="text-3xl font-bold text-text-primary">GG Tracker</h1>
          <p className="text-text-secondary text-sm mt-2">Il tuo diario di trading personale</p>
        </div>

        <Card className="border-border-light/20">
          <CardHeader>
            <CardTitle>Registrati</CardTitle>
            <CardDescription>Crea un nuovo account GG Tracker</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Conferma Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Registrazione in corso...' : 'Registrati'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <span className="text-text-secondary">Hai già un account? </span>
              <Link
                href="/login"
                className="text-primary-500 hover:text-primary-400 font-medium transition-colors"
              >
                Accedi
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
