'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MinimalHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-base">S</span>
          </div>
          <div>
            <h1 className="font-semibold text-gray-800 text-sm">Synapgen</h1>
            <p className="text-xs text-gray-500">Assistant Vocal</p>
          </div>
        </div>

        {/* Logout button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
        >
          <LogOut className="h-4 w-4 mr-2" />
          <span className="text-sm">Déconnexion</span>
        </Button>
      </div>
    </header>
  );
}
