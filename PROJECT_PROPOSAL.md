# Project Proposal: NestPath

## One-Line Description
NestPath is a shared deal workspace for real estate agents and homebuyers that centralizes communication, documents, and transaction progress in one place.

## The Problem
Real estate agents often juggle 10 or more active buyers at different stages of the homebuying process, which forces them to context switch constantly across texts, emails, phone calls, PDFs, and scattered notes. Buyers also struggle to understand what is happening, what comes next, and who is responsible for each step. This creates delays, repetitive questions, missed details, and a fragmented client experience. NestPath matters to me because it tackles a real operational and communication problem in a high-stakes process where transparency and responsiveness directly affect trust and deal velocity.

## Target User
The primary user is an individual real estate agent managing multiple active buyers at once. A secondary user is the homebuyer, who needs a clearer, calmer view of the transaction and a simpler way to communicate and share documents with their agent.

## Core Features (v1)
1. Agent dashboard showing all active deals, their current stage, and the latest update.
2. Ability for an agent to create a deal workspace and invite a buyer into it.
3. Shared deal conversation with both user-generated messages and automatic system updates tied to deal progress.
4. Deal stage tracker with milestones such as touring, offer, under contract, and closing.
5. Document upload and sharing inside each deal workspace.

## Tech Stack
- Frontend: Next.js, because I already have experience with it and it is well-suited for a fast-moving multi-user web product.
- Styling: Tailwind CSS, for quick iteration and consistent UI work across the dashboard, portal, and shared deal views.
- Database: Supabase Postgres, because the product has clear relational data needs across users, deals, messages, stages, and files.
- Auth: Supabase Auth, to support separate agent and buyer logins with a simpler integrated setup.
- APIs: OpenAI API for lightweight AI guidance that surfaces educational previews for common homebuying and process questions before they are sent to the agent.
- Deployment: Vercel, because it pairs well with Next.js and reduces deployment friction during rapid iteration.
- MCP Servers: Supabase MCP for managing schema, auth, and storage workflows more efficiently during development; Playwright MCP for end-to-end testing of multi-user flows and portal interactions.

Note: the recommended stack is Next.js + Tailwind + Supabase + Clerk + Vercel, but justify your choices based on what your project actually needs. Not every project needs auth or external APIs. The architecture should serve the idea, not the other way around.

## Stretch Goals
If the core product is solid, I want to expand NestPath into a richer transaction coordination platform. Stretch goals include appointment and walkthrough scheduling, inviting additional participants such as lenders or title processors, AI-generated deal summaries for agents, and lightweight AI assistance that helps buyers answer common process questions without increasing agent workload. Over time, the platform could evolve from a buyer-agent portal into a broader shared source of truth for real estate transactions in progress.

## Biggest Risk
The biggest risk is building a polished multi-user shared workspace with chat, documents, deal stages, and role-based visibility without letting the scope expand too far. The product touches several complex systems at once, and the challenge will be making the first version feel coherent and useful rather than broad but shallow.

## Week 5 Goal
By the end of the first project week, I want to demo a working end-to-end prototype where an agent can sign in, create a deal workspace, invite a buyer, upload documents, send messages in a shared conversation, and update the deal stage from a dashboard that shows multiple active transactions.
