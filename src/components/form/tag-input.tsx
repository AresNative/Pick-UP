;

import { Plus } from "lucide-react";
import { useState } from "react";

interface TagInputProps {
    cuestion: {
        name: string;
        placeholder?: string;
        label?: string;
        require: boolean;
    };
    control: any;
    register: any;
    watch: any;
    setValue: any;
    errors: any;
}

export const TagInputComponent = ({
    cuestion,
    control,
    register,
    watch,
    setValue,
    errors,
}: TagInputProps) => {
    const [newTag, setNewTag] = useState("");
    const tags = watch(cuestion.name) || [];

    const addTag = (e: any) => { // Recibir el evento
        e.preventDefault();
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            setValue(cuestion.name, [...tags, newTag.trim()]);
            setNewTag("");
        }
    };

    const removeTag = (tagToRemove: string) => {
        setValue(
            cuestion.name,
            tags.filter((tag: string) => tag !== tagToRemove)
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addTag(e);
        }
    };

    return (
        <div className="w-full">
            {cuestion.label && (
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    {cuestion.label}
                    {cuestion.require && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="flex flex-wrap gap-1 mb-2">
                {tags.map((tag: string, index: number) => (
                    <span
                        key={index}
                        className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900 px-2 py-0.5 text-xs font-medium text-purple-800 dark:text-purple-200"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 text-purple-500 hover:text-purple-700 dark:text-purple-300 dark:hover:text-purple-100"
                        >
                            ×
                        </button>
                    </span>
                ))}
            </div>
            <div className="flex">
                <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={cuestion.placeholder || "Añadir etiqueta"}
                    className="bg-white dark:bg-zinc-800 px-4 py-2 border dark:border-zinc-700 focus:ring-purple-500 focus:border-purple-900 w-full sm:text-sm border-gray-300 rounded-md focus:outline-none text-gray-600 dark:text-white"
                />
                <button
                    onClick={addTag}
                    className="ml-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:bg-purple-500 dark:hover:bg-purple-600"
                >
                    <Plus />
                </button>
            </div>
            {errors[cuestion.name] && (
                <p className="mt-1 text-sm text-red-600">{errors[cuestion.name].message}</p>
            )}
        </div>
    );
};