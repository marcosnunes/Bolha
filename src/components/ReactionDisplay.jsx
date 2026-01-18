import { Box, Tooltip, Chip } from '@mui/material';
import { REACTIONS } from './ReactionSelector';

export default function ReactionDisplay({ reactions = {}, onReactionClick }) {
  // Agrupar reactions por tipo: { heart: ['uid1', 'uid2'], laugh: ['uid3'] }
  const groupedReactions = {};
  Object.entries(reactions).forEach(([uid, reactionType]) => {
    if (!groupedReactions[reactionType]) {
      groupedReactions[reactionType] = [];
    }
    groupedReactions[reactionType].push(uid);
  });

  if (Object.keys(groupedReactions).length === 0) {
    return null;
  }

  // Encontrar o emoji para cada tipo de reaction
  const reactionMap = {};
  REACTIONS.forEach((r) => {
    reactionMap[r.value] = r;
  });

  return (
    <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
      {Object.entries(groupedReactions).map(([reactionType, users]) => {
        const reaction = reactionMap[reactionType];
        if (!reaction) return null;

        return (
          <Tooltip key={reactionType} title={`${reaction.label}: ${users.length}`} placement="top">
            <Chip
              label={`${reaction.emoji} ${users.length}`}
              size="small"
              onClick={() => onReactionClick?.(reactionType, users)}
              sx={{
                backgroundColor: '#f5f5f5',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: '#ffe0b2',
                  transform: 'scale(1.05)',
                },
              }}
              variant="outlined"
            />
          </Tooltip>
        );
      })}
    </Box>
  );
}
