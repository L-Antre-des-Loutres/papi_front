import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsProvider } from './context/SettingsContext';
import { useStorageSync } from './hooks/useStorageSync';
import Layout from './components/layout/Layout/Layout';
import ProtectedRoute from './components/ui/ProtectedRoute/ProtectedRoute';
import Login from './pages/Login/Login';
import Home from './pages/Home/Home';
import Pokemon from './pages/Pokemon/Pokemon';
import PokemonDetails from './pages/PokemonDetails/PokemonDetails';
import PokemonExport from './pages/PokemonExport/PokemonExport';
import Abilities from './pages/Abilities/Abilities';
import Moves from './pages/Moves/Moves';
import Types from './pages/Types/Types';
import Users from './pages/Users/Users';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            retry: 1,
        },
    },
});

function AppRoutes() {
    useStorageSync();

    return (
        <BrowserRouter>
            <Routes>
                <Route element={<Layout />}>
                    <Route path="login" element={<Login />} />

                    <Route element={<ProtectedRoute />}>
                        <Route index              element={<Home />} />
                        <Route path="pokemon"        element={<Pokemon />} />
                        <Route path="pokemon/export" element={<PokemonExport />} />
                        <Route path="pokemon/:id"    element={<PokemonDetails />} />
                        <Route path="abilities"   element={<Abilities />} />
                        <Route path="moves"       element={<Moves />} />
                        <Route path="types"       element={<Types />} />
                        <Route path="users"       element={<Users />} />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default function App() {
    return (
        <SettingsProvider>
        <QueryClientProvider client={queryClient}>
            <AppRoutes />
        </QueryClientProvider>
        </SettingsProvider>
    );
}
