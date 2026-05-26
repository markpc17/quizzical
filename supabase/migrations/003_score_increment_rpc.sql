CREATE OR REPLACE FUNCTION increment_player_score(
  p_player_id UUID,
  p_score_delta INT,
  p_time_delta INT
) RETURNS void LANGUAGE sql AS $$
  UPDATE players
  SET total_score = total_score + p_score_delta,
      total_time_ms = total_time_ms + p_time_delta
  WHERE id = p_player_id;
$$;
