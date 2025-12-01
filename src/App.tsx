import { WorkbookShell } from './react/components/WorkbookShell';

function App() {
    return (
        <div className="w-screen h-screen flex flex-col bg-gray-50">
            <header className="p-4 border-b bg-white">
                <h1 className="text-xl font-bold">Grid Engine Library Dev</h1>
                <p className="text-sm text-gray-500">
                    Run <code className="bg-gray-100 px-1 rounded">npm run storybook</code> for components 
                    or check <code className="bg-gray-100 px-1 rounded">examples/demo-app</code>.
                </p>
            </header>
            <main className="flex-1 relative overflow-hidden">
                <WorkbookShell />
            </main>
        </div>
    );
}

export default App;
