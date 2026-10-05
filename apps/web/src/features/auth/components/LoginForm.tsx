import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { loginSchema, type LoginInput } from '@app/shared';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useLogin } from '../hooks/useAuth';

export const LoginForm: React.FC = () => {
  const { mutate: login, isPending } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginInput) => {
    console.log(data,"asd");
    login(data);
  };

  return (
    <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10">
      <div className="text-center mb-8">
        <Link to="/" className="text-3xl font-black text-red-600 tracking-wider">
          STREAM<span className="text-white">VERSE</span>
        </Link>
        <h2 className="text-xl font-semibold text-slate-200 mt-2">Welcome Back</h2>
        <p className="text-sm text-slate-400">Sign in to access your library and streams</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" isLoading={isPending}>
          Sign In
        </Button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-6">
        New to StreamVerse?{' '}
        <Link to="/register" className="text-red-500 hover:text-red-400 font-medium transition-colors">
          Create an account
        </Link>
      </p>
    </div>
  );
};