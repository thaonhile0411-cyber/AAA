"use client";

import { useId } from "react";
import type { WritingPrompt } from "./types";

const colors = ["#175cdd", "#168578", "#af4c83", "#d38b12", "#7b64b6"];
export function PromptGraphic({ prompt }: { prompt: WritingPrompt }) {
  const id = useId();
  if (!prompt.graphic) return null;
  const type = prompt.graphic.type;
  return (
    <svg
      viewBox="0 0 800 470"
      width="800"
      height="470"
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
      style={{
        display: "block",
        width: "100%",
        height: "auto",
        background: "white",
        color: "#1e2c46",
        fontFamily: "Arial, sans-serif",
        fontSize: 18,
      }}
    >
      <title id={`${id}-title`}>{prompt.title}</title>
      <desc id={`${id}-desc`}>{prompt.graphic.description}</desc>
      <rect width="800" height="470" fill="white" />
      <text x="400" y="35" textAnchor="middle" fontSize="23" fontWeight="700">
        {prompt.title}
      </text>
      {type === "Line graph" && (
        <>
          <text x="30" y="67" fontSize="16">
            Households with internet access (%)
          </text>
          {[0, 20, 40, 60, 80, 100].map((v) => (
            <g key={v}>
              <line
                x1="85"
                y1={370 - v * 2.8}
                x2="725"
                y2={370 - v * 2.8}
                stroke="#dce3ec"
              />
              <text x="65" y={376 - v * 2.8} textAnchor="end">
                {v}
              </text>
            </g>
          ))}
          {[2000, 2005, 2010, 2015, 2020].map((v, i) => (
            <text key={v} x={85 + i * 160} y="402" textAnchor="middle">
              {v}
            </text>
          ))}
          {[
            [20, 40, 60, 80, 90],
            [10, 25, 45, 65, 85],
            [5, 15, 30, 50, 70],
          ].map((values, i) => (
            <g key={i}>
              <polyline
                points={values
                  .map((v, j) => `${85 + j * 160},${370 - v * 2.8}`)
                  .join(" ")}
                fill="none"
                stroke={colors[i]}
                strokeWidth="4"
                strokeDasharray={i === 1 ? "9 5" : i === 2 ? "3 5" : undefined}
              />
              {values.map((v, j) => (
                <circle
                  key={j}
                  cx={85 + j * 160}
                  cy={370 - v * 2.8}
                  r="5"
                  fill={colors[i]}
                />
              ))}
              <rect
                x={145 + i * 190}
                y="432"
                width="20"
                height="8"
                fill={colors[i]}
              />
              <text x={172 + i * 190} y="443">
                Country {String.fromCharCode(65 + i)}
              </text>
            </g>
          ))}
        </>
      )}
      {type === "Bar chart" && (
        <>
          <text x="30" y="68" fontSize="16">
            Commuters (%)
          </text>
          {[0, 10, 20, 30, 40, 50, 60].map((v) => (
            <g key={v}>
              <line
                x1="85"
                x2="740"
                y1={370 - v * 4.7}
                y2={370 - v * 4.7}
                stroke="#dce3ec"
              />
              <text x="67" y={376 - v * 4.7} textAnchor="end">
                {v}
              </text>
            </g>
          ))}
          {[
            [50, 35],
            [25, 30],
            [10, 20],
            [15, 15],
          ].map((values, i) => (
            <g key={i}>
              {values.map((v, j) => (
                <g key={j}>
                  <rect
                    x={120 + i * 155 + j * 44}
                    y={370 - v * 4.7}
                    width="36"
                    height={v * 4.7}
                    fill={colors[j]}
                  />
                  <text
                    x={138 + i * 155 + j * 44}
                    y={360 - v * 4.7}
                    textAnchor="middle"
                    fontSize="16"
                  >
                    {v}
                  </text>
                </g>
              ))}
              <text x={160 + i * 155} y="402" textAnchor="middle">
                {["Car", "Bus", "Bicycle", "Walking"][i]}
              </text>
            </g>
          ))}
          {["2010", "2020"].map((year, i) => (
            <g key={year}>
              <rect
                x={290 + i * 150}
                y="430"
                width="20"
                height="14"
                fill={colors[i]}
              />
              <text x={320 + i * 150} y="443">
                {year}
              </text>
            </g>
          ))}
        </>
      )}
      {type === "Pie chart" && (
        <>
          <text x="400" y="68" textAnchor="middle" fontSize="16">
            Average household energy consumption, 2020
          </text>
          {[40, 25, 20, 10, 5].map((value, i, values) => {
            const start =
              (values.slice(0, i).reduce((a, b) => a + b, 0) / 100) *
                Math.PI *
                2 -
              Math.PI / 2;
            const end = start + (value / 100) * Math.PI * 2;
            return (
              <g key={i}>
                <path
                  d={`M 245 265 L ${245 + 150 * Math.cos(start)} ${265 + 150 * Math.sin(start)} A 150 150 0 0 1 ${245 + 150 * Math.cos(end)} ${265 + 150 * Math.sin(end)} Z`}
                  fill={colors[i]}
                  stroke="white"
                  strokeWidth="3"
                />
                <rect
                  x="455"
                  y={145 + i * 55}
                  width="20"
                  height="20"
                  fill={colors[i]}
                />
                <text x="490" y={162 + i * 55}>
                  {
                    [
                      "Heating",
                      "Water heating",
                      "Appliances",
                      "Lighting",
                      "Cooling",
                    ][i]
                  }
                  : {value}%
                </text>
              </g>
            );
          })}
        </>
      )}
      {type === "Table" && (
        <>
          <text x="400" y="80" textAnchor="middle">
            Annual visitors (thousands)
          </text>
          {[
            ["Library", "2010", "2015", "2020"],
            ["Central", "120", "150", "180"],
            ["North", "80", "75", "70"],
            ["South", "50", "70", "100"],
          ].map((row, i) => (
            <g key={i}>
              {row.map((cell, j) => (
                <g key={j}>
                  <rect
                    x={60 + j * 170}
                    y={115 + i * 72}
                    width="170"
                    height="72"
                    fill={i === 0 ? "#eaf1ff" : i % 2 ? "#fff" : "#f5f7fb"}
                    stroke="#b8c6da"
                  />
                  <text
                    x={145 + j * 170}
                    y={159 + i * 72}
                    textAnchor="middle"
                    fontWeight={i === 0 || j === 0 ? "700" : "400"}
                  >
                    {cell}
                  </text>
                </g>
              ))}
            </g>
          ))}
        </>
      )}
      {type === "Process" && (
        <>
          <text x="400" y="76" textAnchor="middle" fontSize="16">
            From waste paper to new paper · follow the arrows
          </text>
          {[
            ["Collect", "waste paper"],
            ["Sort", "paper"],
            ["Mix with water", "to make pulp"],
            ["Filter and", "remove ink"],
            ["Press", "and dry"],
            ["Roll into", "new paper"],
          ].map((lines, i) => {
            const x = 55 + (i < 3 ? i : 5 - i) * 250;
            const y = i < 3 ? 125 : 300;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width="190"
                  height="105"
                  rx="12"
                  fill="#eef4ff"
                  stroke="#175cdd"
                  strokeWidth="2"
                />
                <text
                  x={x + 95}
                  y={y + 26}
                  textAnchor="middle"
                  fontWeight="700"
                  fill="#175cdd"
                >
                  {i + 1}
                </text>
                <text x={x + 95} y={y + 57} textAnchor="middle">
                  {lines[0]}
                </text>
                <text x={x + 95} y={y + 82} textAnchor="middle">
                  {lines[1]}
                </text>
                {i < 2 && (
                  <path
                    d={`M ${x + 202} ${y + 53} h 32 l -8 -7 m 8 7 l -8 7`}
                    fill="none"
                    stroke="#175cdd"
                    strokeWidth="3"
                  />
                )}
                {i === 2 && (
                  <path
                    d={`M ${x + 95} ${y + 117} v 45 l -7 -8 m 7 8 l 7 -8`}
                    fill="none"
                    stroke="#175cdd"
                    strokeWidth="3"
                  />
                )}
                {i > 2 && i < 5 && (
                  <path
                    d={`M ${x - 12} ${y + 53} h -32 l 8 -7 m -8 7 l 8 7`}
                    fill="none"
                    stroke="#175cdd"
                    strokeWidth="3"
                  />
                )}
              </g>
            );
          })}
        </>
      )}
      {type === "Map" && (
        <>
          {[2000, 2020].map((year, i) => (
            <g key={year} transform={`translate(${35 + i * 385}, 70)`}>
              <text x="165" y="18" textAnchor="middle" fontWeight="700">
                {year}
              </text>
              <rect
                x="0"
                y="38"
                width="330"
                height="290"
                fill="#f0f5e9"
                stroke="#64718a"
                strokeWidth="2"
              />
              <rect x="290" y="38" width="40" height="290" fill="#b9e2fb" />
              <text transform="translate(317,230) rotate(-90)" fontSize="16">
                River
              </text>
              {[
                ["Woodland", 12, 65],
                [i ? "Playground" : "Lawn", 160, 65],
                [i ? "Garden" : "Pond", 12, 210],
                [i ? "Cafe" : "Car park", 160, 210],
              ].map(([label, x, y]) => (
                <g key={label}>
                  <rect
                    x={Number(x)}
                    y={Number(y)}
                    width="118"
                    height="75"
                    rx="6"
                    fill={label === "Pond" ? "#b9e2fb" : "#d8e6c8"}
                    stroke="#789469"
                  />
                  <text
                    x={Number(x) + 59}
                    y={Number(y) + 44}
                    textAnchor="middle"
                    fontSize="16"
                  >
                    {label}
                  </text>
                </g>
              ))}
              {i === 1 && (
                <>
                  <path d="M 145 38 V 328" stroke="#bcaa83" strokeWidth="14" />
                  <text x="151" y="179" fontSize="14">
                    Footpath
                  </text>
                </>
              )}
              <text x="145" y="354" textAnchor="middle" fontSize="16">
                Entrance
              </text>
              <text x="347" y="62" fontSize="16">
                N ↑
              </text>
            </g>
          ))}
        </>
      )}
    </svg>
  );
}
