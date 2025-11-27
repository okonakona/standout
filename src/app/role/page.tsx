"use client";
import { useState } from "react";
import { addRoleModel, setActiveRoleId, RoleModel } from "@/utils/roleSession";
import { useRouter } from "next/navigation";

export default function RolePage() {
    const [presetId, setPresetId] = useState<RoleModel["presetId"]>("clean");
    const [name, setName] = useState<string>("マイロール");
    const router = useRouter();

    const createRole = () => {
        const id = "role_" + Math.random().toString(36).slice(2, 8);
        const role: RoleModel = { id, name: name.trim() || "マイロール", presetId };
        addRoleModel(role);
        setActiveRoleId(id);
        // 作成後は写真取得手段へ誘導
        router.push("/role/next");
    };

    return (
        <main style={{ padding: 24 }}>
            <h1>ロールモデル作成</h1>
            <p>仕上がりの方向性（プリセット）と名前を決めて保存します。</p>

            <div style={{ display: "flex", gap: 12, margin: "12px 0" }}>
                <button onClick={() => setPresetId("clean")} aria-pressed={presetId === "clean"}>
                    清潔感
                </button>
                <button onClick={() => setPresetId("kpop")} aria-pressed={presetId === "kpop"}>
                    韓国風
                </button>
                <button
                    onClick={() => setPresetId("androgynous")}
                    aria-pressed={presetId === "androgynous"}
                >
                    中性的
                </button>
            </div>

            <div style={{ margin: "12px 0" }}>
                <label>
                    名前：
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{ marginLeft: 8 }}
                    />
                </label>
            </div>

            <button onClick={createRole}>保存して次へ</button>
        </main>
    );
}
