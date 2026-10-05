import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { registerSchema, type RegisterInput } from '@app/shared';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useRegister } from '../hooks/useAuth';

export const RegisterForm: React.FC = () => {
  const { mutate: registerUser, isPending } = useRegister();

  // Omit the generic type <RegisterFormValues> on useForm. 
  // Let zodResolver infer the exact input/output types from registerSchema.
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'USER',
    },
  });

  const onSubmit = (data: RegisterInput) => {
    registerUser(data);
  };

  return (
    <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10">
      <div className="text-center mb-8">
        <Link to="/" className="text-3xl font-black text-red-600 tracking-wider">
          STREAM<span className="text-white">VERSE</span>
        </Link>
        <h2 className="text-xl font-semibold text-slate-200 mt-2">Create Your Account</h2>
        <p className="text-sm text-slate-400">Join creators and viewers across StreamVerse</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          placeholder="John Doe"
          error={errors.name?.message}
          {...register('name')}
        />

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

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Account Role
          </label>
          <select
            {...register('role')}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
          >
            <option value="USER">Viewer (Watch streams & interact)</option>
            <option value="CREATOR">Creator (Upload & broadcast content)</option>
          </select>
        </div>

        <Button type="submit" isLoading={isPending} className="mt-4">
          Get Started
        </Button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-red-500 hover:text-red-400 font-medium transition-colors">
          Sign In
        </Link>
      </p>
    </div>
  );
};