// src/components/result/MakeupSpecSheet.tsx
"use client";
import React, { useRef } from "react";
import { Step, STEP_CONFIG } from "@/types/steps";
import styles from "./MakeupSpecSheet.module.css";

type MakeupStep = {
    step: Step;
    label: string;
    color: string;
    strength: number;
    imageUrl?: string;
};

type Props = {
    steps: MakeupStep[];
    finalImageUrl?: string;
    userName?: string;
    date?: string;
    message?: string;
};

function getMethodText(step: Step, config: any): string {
    const methods: Record<Step, string> = {
        primer: "顔全体に均一に伸ばし、メイクのベースを整えます。Tゾーンは薄めに、乾燥しやすい部分は重ね付けします。",
        foundation:
            "中心から外側に向かって、スポンジやブラシで均一に伸ばします。首との境目をぼかして自然に仕上げます。",
        concealer:
            "気になる部分に薄く重ね、指で軽くたたいてなじませます。厚塗りを避けて自然な仕上がりに。",
        powder: "Tゾーンを中心に、余分な油分を抑えます。ブラシで薄く重ねて、マットな質感に仕上げます。",
        contour:
            "フェイスラインや鼻筋に影を入れて、立体感を出します。ぼかしを丁寧に行い自然な陰影を作ります。",
        highlight:
            "頬骨の高い位置や鼻筋に光を集めて、ツヤ感を出します。指で軽くたたいてなじませます。",
        cheek: "頬の高い位置に、円を描くようにブラシで入れます。笑ったときに高くなる部分に入れると自然な血色感が出ます。",
        brows: "眉頭から眉尻に向かって、毛流れに沿って描きます。眉頭は薄め、眉尻に向かって濃くします。",
        shadow: "アイホール全体にベースカラーを塗り、グラデーションを作ります。目のキワに締め色を入れて目元を強調します。",
        lips: "リップライナーで輪郭を取ってから、中を塗りつぶします。ティッシュオフして重ね塗りすると持ちが良くなります。",
    };
    return methods[step] || "適量を取り、丁寧になじませます。";
}

export default function MakeupSpecSheet({ steps, finalImageUrl, userName, date, message }: Props) {
    const [editableMessage, setEditableMessage] = React.useState(
        message || "このメイクで理想の自分を表現しましょう！"
    );
    const [isExpanded, setIsExpanded] = React.useState(false);

    const handlePrint = () => {
        const printWindow = window.open("", "", "width=800,height=600");
        if (printWindow) {
            // 印刷用のHTML全体を構築
            const stepsHTML = steps
                .map((stepData, index) => {
                    const config = STEP_CONFIG[stepData.step];
                    const methodText = getMethodText(stepData.step, config);
                    return `
                        <div class="step-item">
                            <div class="step-number">${index + 1}</div>
                            ${
                                stepData.imageUrl
                                    ? `<div class="step-image"><img src="${stepData.imageUrl}" alt="${stepData.label}" /></div>`
                                    : ""
                            }
                            <div class="step-content">
                                <div class="step-title">${stepData.label}</div>
                                <div class="step-details">
                                    <div class="step-detail-row">
                                        <strong>カラー:</strong>
                                        <span class="color-swatch" style="background-color: ${stepData.color}"></span>
                                        <span style="margin-left: 8px">${stepData.color}</span>
                                    </div>
                                    <div class="step-detail-row">
                                        <strong>濃度:</strong> ${Math.round(stepData.strength * 100)}%
                                    </div>
                                    <div class="step-detail-row">
                                        <strong>ブレンド:</strong> ${config.blend}
                                    </div>
                                    <div class="step-detail-row">
                                        <strong>質感:</strong> ${config.brush}
                                    </div>
                                    <div class="method-text">
                                        <strong>方法:</strong>
                                        <p>${methodText}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                })
                .join("");

            printWindow.document.write(`
                    <html>
                        <head>
                            <title>メイク仕様書</title>
                            <style>
                                body { 
                                    font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; 
                                    padding: 20px; 
                                    margin: 0;
                                    background: white;
                                    color: #333;
                                }
                                .spec-container { 
                                    max-width: 800px; 
                                    margin: 0 auto;
                                    background: white;
                                }
                                .logo-section {
                                    text-align: center;
                                    padding: 30px 0 20px;
                                    border-bottom: 3px solid #2196f3;
                                    margin-bottom: 30px;
                                }
                                .logo-section img {
                                    max-width: 200px;
                                    height: auto;
                                }
                                .spec-header { 
                                    text-align: center; 
                                    margin-bottom: 30px; 
                                    padding-bottom: 20px;
                                }
                                .spec-title { 
                                    font-size: 32px; 
                                    font-weight: bold; 
                                    margin: 20px 0;
                                    color: #333;
                                    letter-spacing: 2px;
                                }
                                .spec-info { 
                                    display: flex; 
                                    justify-content: space-between; 
                                    margin-top: 15px; 
                                    font-size: 14px; 
                                    color: #666;
                                    padding: 0 20px;
                                }
                                .final-image { 
                                    text-align: center; 
                                    margin: 40px 0;
                                    padding: 20px;
                                    background: #fafafa;
                                    border-radius: 12px;
                                }
                                .final-image h2 {
                                    font-size: 20px;
                                    margin-bottom: 20px;
                                    color: #333;
                                }
                                .final-image img { 
                                    max-width: 400px; 
                                    border-radius: 12px; 
                                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                                }
                                .message-section {
                                    margin: 30px 0;
                                    padding: 20px;
                                    background: #f5f5f5;
                                    border-radius: 8px;
                                    border-left: 4px solid #2196f3;
                                }
                                .message-section h2 {
                                    font-size: 18px;
                                    margin-bottom: 12px;
                                    color: #333;
                                }
                                .message-content {
                                    font-size: 14px;
                                    line-height: 1.6;
                                    color: #555;
                                    white-space: pre-wrap;
                                }
                                .steps-section { 
                                    margin-top: 30px;
                                }
                                .section-title { 
                                    font-size: 22px; 
                                    font-weight: bold; 
                                    margin-bottom: 20px; 
                                    border-bottom: 2px solid #e0e0e0; 
                                    padding-bottom: 12px;
                                    color: #333;
                                }
                                .step-item { 
                                    display: flex; 
                                    gap: 20px; 
                                    margin-bottom: 24px; 
                                    padding: 20px; 
                                    border: 1px solid #e0e0e0; 
                                    border-radius: 12px; 
                                    background: #fafafa;
                                    page-break-inside: avoid;
                                    transition: box-shadow 0.2s ease;
                                }
                                .step-number { 
                                    width: 48px; 
                                    height: 48px; 
                                    display: flex; 
                                    align-items: center; 
                                    justify-content: center; 
                                    background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
                                    color: white; 
                                    border-radius: 50%; 
                                    font-weight: bold; 
                                    font-size: 20px;
                                    flex-shrink: 0;
                                    box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
                                }
                                .step-image {
                                    width: 200px;
                                    height: 200px;
                                    flex-shrink: 0;
                                    border-radius: 8px;
                                    overflow: hidden;
                                    border: 2px solid #e0e0e0;
                                }
                                .step-image img {
                                    width: 100%;
                                    height: 100%;
                                    object-fit: cover;
                                }
                                .step-content { 
                                    flex: 1;
                                }
                                .step-title { 
                                    font-size: 18px; 
                                    font-weight: bold; 
                                    margin-bottom: 12px;
                                    color: #333;
                                }
                                .step-details { 
                                    font-size: 14px; 
                                    color: #666;
                                }
                                .step-detail-row { 
                                    margin: 8px 0;
                                    display: flex;
                                    align-items: center;
                                }
                                .step-detail-row strong {
                                    min-width: 80px;
                                    color: #333;
                                }
                                .color-swatch { 
                                    display: inline-block; 
                                    width: 24px; 
                                    height: 24px; 
                                    border-radius: 4px; 
                                    border: 1px solid #ccc; 
                                    vertical-align: middle; 
                                    margin: 0 8px;
                                }
                                .method-text {
                                    margin-top: 12px;
                                    padding-top: 12px;
                                    border-top: 1px dashed #ddd;
                                }
                                .method-text p {
                                    margin: 8px 0 0 0;
                                    font-size: 13px;
                                    line-height: 1.6;
                                    color: #555;
                                }
                                .notes {
                                    margin-top: 40px;
                                    padding: 20px;
                                    background: #f5f5f5;
                                    border-radius: 8px;
                                    font-size: 14px;
                                    line-height: 1.6;
                                    color: #666;
                                }
                                .notes h2 {
                                    font-size: 18px;
                                    margin-bottom: 12px;
                                    color: #333;
                                }
                                .notes p {
                                    margin: 8px 0;
                                }
                                @media print {
                                    body { 
                                        print-color-adjust: exact; 
                                        -webkit-print-color-adjust: exact; 
                                    }
                                    .no-print { 
                                        display: none; 
                                    }
                                    .step-item {
                                        page-break-inside: avoid;
                                    }
                                }
                            </style>
                        </head>
                        <body>
                            <div class="spec-container">
                                <div class="logo-section">
                                    <img src="/assets/logo.svg" alt="Logo" />
                                </div>
                                <div class="spec-header">
                                    <h1 class="spec-title">メイク仕様書</h1>
                                    <div class="spec-info">
                                        <div>${userName ? `<span>お名前: ${userName}</span>` : ""}</div>
                                        <div>作成日: ${date || new Date().toLocaleDateString("ja-JP")}</div>
                                    </div>
                                </div>
                                ${
                                    finalImageUrl
                                        ? `
                                    <div class="final-image">
                                        <h2>完成イメージ</h2>
                                        <img src="${finalImageUrl}" alt="完成メイク" />
                                    </div>
                                `
                                        : ""
                                }
                                <div class="message-section">
                                    <h2>一言メッセージ</h2>
                                    <div class="message-content">${editableMessage}</div>
                                </div>
                                <div class="steps-section">
                                    <h2 class="section-title">メイク手順</h2>
                                    ${stepsHTML}
                                </div>
                                <div class="notes">
                                    <h2>備考</h2>
                                    <p>この仕様書は、メイクシミュレーションの結果を記録したものです。</p>
                                    <p>実際のメイクアップの際は、肌の状態や照明環境により色味が異なる場合があります。</p>
                                </div>
                            </div>
                        </body>
                    </html>
                `);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    };

    const handleDownloadPDF = () => {
        handlePrint();
    };

    return (
        <div className={styles.container}>
            <div className={styles.controls}>
                <button onClick={handlePrint} className={styles.printButton}>
                    印刷
                </button>
                <button onClick={handleDownloadPDF} className={styles.pdfButton}>
                    PDF保存
                </button>
            </div>

            <div className={styles.specSheet}>
                <div className={styles.header}>
                    <h1 className={styles.title}>メイク仕様書</h1>
                    <div className={styles.info}>
                        <div>{userName && <span>お名前: {userName}</span>}</div>
                        <div>作成日: {date || new Date().toLocaleDateString("ja-JP")}</div>
                    </div>
                </div>

                {finalImageUrl && (
                    <div className={styles.finalImage}>
                        <h2>完成イメージ</h2>
                        <img src={finalImageUrl} alt="完成メイク" />
                    </div>
                )}

                <div className={styles.messageSection}>
                    <h2 className={styles.sectionTitle}>一言メッセージ</h2>
                    <div className={styles.messageBox}>
                        <textarea
                            className={`${styles.messageInput} no-print`}
                            value={editableMessage}
                            onChange={(e) => setEditableMessage(e.target.value)}
                            placeholder="メイクの印象やポイントを入力してください"
                            rows={3}
                        />
                        <p className={styles.messagePrint}>{editableMessage}</p>
                    </div>
                </div>

                <div className={styles.toggleContainer}>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={styles.toggleButton}
                    >
                        {isExpanded ? "詳細を閉じる ▲" : "詳細を見る ▼"}
                    </button>
                </div>

                {isExpanded && (
                    <>
                        <div className={styles.stepsSection}>
                            <h2 className={styles.sectionTitle}>メイク手順</h2>
                            {steps.map((stepData, index) => {
                                const config = STEP_CONFIG[stepData.step];
                                const methodText = getMethodText(stepData.step, config);
                                return (
                                    <div key={stepData.step} className={styles.stepItem}>
                                        <div className={styles.stepNumber}>{index + 1}</div>
                                        {stepData.imageUrl && (
                                            <div className={styles.stepImage}>
                                                <img src={stepData.imageUrl} alt={stepData.label} />
                                            </div>
                                        )}
                                        <div className={styles.stepContent}>
                                            <div className={styles.stepTitle}>{stepData.label}</div>
                                            <div className={styles.stepDetails}>
                                                <div className={styles.detailRow}>
                                                    <strong>カラー:</strong>
                                                    <span
                                                        className={styles.colorSwatch}
                                                        style={{ backgroundColor: stepData.color }}
                                                    ></span>
                                                    <span style={{ marginLeft: 8 }}>
                                                        {stepData.color}
                                                    </span>
                                                </div>
                                                <div className={styles.detailRow}>
                                                    <strong>濃度:</strong>{" "}
                                                    {Math.round(stepData.strength * 100)}%
                                                </div>
                                                <div className={styles.detailRow}>
                                                    <strong>ブレンド:</strong> {config.blend}
                                                </div>
                                                <div className={styles.detailRow}>
                                                    <strong>質感:</strong> {config.brush}
                                                </div>
                                                <div className={styles.methodText}>
                                                    <strong>方法:</strong>
                                                    <p>{methodText}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className={styles.notes}>
                            <h2 className={styles.sectionTitle}>備考</h2>
                            <div className={styles.notesContent}>
                                <p>
                                    この仕様書は、メイクシミュレーションの結果を記録したものです。
                                </p>
                                <p>
                                    実際のメイクアップの際は、肌の状態や照明環境により色味が異なる場合があります。
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
