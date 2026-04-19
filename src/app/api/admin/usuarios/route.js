import { NextResponse } from 'next/server';
import { init, User } from '../../../../services/db.js';
import { authenticateAdminRequest } from '../../../../services/admin-auth.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const auth = await authenticateAdminRequest(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    
    await init;
    const limite = Math.min(Number(request.nextUrl.searchParams.get('limite')) || 50, 200);
    const offset = Math.max(Number(request.nextUrl.searchParams.get('offset')) || 0, 0);
    
    const usuarios = await User.findAll({
      attributes: ['id', 'email', 'nome', 'conta_liberada', 'two_factor_enabled'],
      order: [['id', 'DESC']],
      limit: limite,
      offset,
      raw: true
    });
    
    const total = await User.count();
    return NextResponse.json({ success: true, usuarios, total, limite, offset });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao listar usuários.' }, { status: 500 });
  }
}
